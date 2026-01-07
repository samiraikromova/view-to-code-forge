import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('VdoCipher OTP function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();
    console.log('Requested video ID:', videoId);
    
    if (!videoId) {
      console.error('Missing video ID');
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiSecret = Deno.env.get('VDOCIPHER_API_SECRET');
    
    if (!apiSecret) {
      console.error('VDOCIPHER_API_SECRET not found in environment');
      return new Response(
        JSON.stringify({ error: 'VdoCipher API secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching OTP from VdoCipher API...');

    const response = await fetch(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Apisecret ${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl: 300,
      }),
    });

    console.log('VdoCipher API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VdoCipher API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get video OTP', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('VdoCipher OTP fetched successfully');

    return new Response(
      JSON.stringify({
        otp: data.otp,
        playbackInfo: data.playbackInfo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('VdoCipher OTP exception:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Network error occurred', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
