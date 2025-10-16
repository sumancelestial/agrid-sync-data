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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('QBO Sync - Starting customer sync for user:', user.id);

    // Get QBO connection
    const { data: connection, error: connError } = await supabase
      .from('qbo_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      throw new Error('QuickBooks not connected. Please connect first.');
    }

    // Check if token needs refresh
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();
    
    let accessToken = connection.access_token;
    
    if (expiresAt <= now) {
      console.log('QBO Sync - Access token expired, refreshing...');
      
      const QBO_CLIENT_ID = Deno.env.get('QBO_CLIENT_ID');
      const QBO_CLIENT_SECRET = Deno.env.get('QBO_CLIENT_SECRET');
      const basicAuth = btoa(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`);

      const refreshResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
      
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

      // Update connection with new tokens
      await supabase
        .from('qbo_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('user_id', user.id);

      console.log('QBO Sync - Token refreshed successfully');
    }

    // Use sandbox API URL for testing
    const apiUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${connection.realm_id}/query`;
    const query = 'SELECT * FROM Customer MAXRESULTS 100';

    console.log('QBO Sync - Fetching customers from QuickBooks...');

    const qboResponse = await fetch(`${apiUrl}?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!qboResponse.ok) {
      const errorText = await qboResponse.text();
      console.error('QBO API Error:', errorText);
      throw new Error('Failed to fetch customers from QuickBooks');
    }

    const qboData = await qboResponse.json();
    const customers = qboData.QueryResponse?.Customer || [];

    console.log(`QBO Sync - Retrieved ${customers.length} customers`);

    // Transform and store customers
    const customerRecords = customers.map((customer: any) => ({
      user_id: user.id,
      qbo_id: customer.Id,
      display_name: customer.DisplayName || '',
      company_name: customer.CompanyName || null,
      given_name: customer.GivenName || null,
      family_name: customer.FamilyName || null,
      email: customer.PrimaryEmailAddr?.Address || null,
      phone: customer.PrimaryPhone?.FreeFormNumber || null,
      billing_address_line1: customer.BillAddr?.Line1 || null,
      billing_address_city: customer.BillAddr?.City || null,
      billing_address_state: customer.BillAddr?.CountrySubDivisionCode || null,
      billing_address_postal_code: customer.BillAddr?.PostalCode || null,
      billing_address_country: customer.BillAddr?.Country || null,
      active: customer.Active !== false,
      balance: customer.Balance || 0,
      synced_at: new Date().toISOString(),
    }));

    // Batch upsert customers
    if (customerRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('qbo_customers')
        .upsert(customerRecords, {
          onConflict: 'user_id,qbo_id',
        });

      if (upsertError) {
        console.error('Database upsert error:', upsertError);
        throw new Error('Failed to save customers to database');
      }

      console.log(`QBO Sync - Successfully synced ${customerRecords.length} customers`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: customerRecords.length,
        message: `Successfully synced ${customerRecords.length} customers`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('QBO Sync Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
