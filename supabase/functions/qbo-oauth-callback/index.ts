import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const realmId = url.searchParams.get('realmId');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('QBO OAuth Error:', error);
      return new Response(
        `<html><body><h1>Authorization Failed</h1><p>${error}</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !realmId) {
      throw new Error('Missing authorization code or realm ID');
    }

    const QBO_CLIENT_ID = Deno.env.get('QBO_CLIENT_ID');
    const QBO_CLIENT_SECRET = Deno.env.get('QBO_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/qbo-oauth-callback`;

    if (!QBO_CLIENT_ID || !QBO_CLIENT_SECRET) {
      throw new Error('QBO credentials not configured');
    }

    // Exchange authorization code for tokens
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    const basicAuth = btoa(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    console.log('QBO OAuth - Token received successfully');

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      // Store in session and redirect to a page that will handle the connection
      return new Response(
        `<html><body><h1>Authorization Successful</h1><p>Redirecting...</p><script>
          localStorage.setItem('qbo_pending', JSON.stringify({
            realmId: '${realmId}',
            accessToken: '${tokenData.access_token}',
            refreshToken: '${tokenData.refresh_token}',
            expiresIn: ${tokenData.expires_in}
          }));
          window.opener?.postMessage({ type: 'qbo-connected', realmId: '${realmId}' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Store connection in database
    const { error: dbError } = await supabase
      .from('qbo_connections')
      .upsert({
        user_id: user.id,
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store connection');
    }

    console.log('QBO connection stored successfully for user:', user.id);

    return new Response(
      `<html><body><h1>Connected Successfully</h1><p>You can close this window.</p><script>window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('QBO OAuth Callback Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<html><body><h1>Error</h1><p>${errorMessage}</p><script>window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
