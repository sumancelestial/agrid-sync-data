import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const QBO_CLIENT_ID = Deno.env.get('QBO_CLIENT_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/qbo-oauth-callback`;
    
    if (!QBO_CLIENT_ID) {
      throw new Error('QBO_CLIENT_ID not configured');
    }

    // For sandbox, use sandbox URLs
    const authUrl = 'https://appcenter.intuit.com/connect/oauth2';
    
    const params = new URLSearchParams({
      client_id: QBO_CLIENT_ID,
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: redirectUri,
      state: crypto.randomUUID(), // Add state for security
    });

    const authorizationUrl = `${authUrl}?${params.toString()}`;
    
    console.log('QBO OAuth Init - Authorization URL:', authorizationUrl);

    return new Response(
      JSON.stringify({ url: authorizationUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('QBO OAuth Init Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
