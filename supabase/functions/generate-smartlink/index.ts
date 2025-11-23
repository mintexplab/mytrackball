import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmartLinkRequest {
  spotifyUrl: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spotifyUrl, userId }: SmartLinkRequest = await req.json();

    console.log("Generating smart link for:", spotifyUrl);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!spotifyUrl || !spotifyUrl.includes("spotify.com")) {
      throw new Error("Invalid Spotify URL");
    }

    // Extract Spotify ID from URL
    // URL formats: https://open.spotify.com/track/ID or /album/ID
    const urlMatch = spotifyUrl.match(/spotify\.com\/(track|album)\/([a-zA-Z0-9]+)/);
    if (!urlMatch) {
      throw new Error("Could not extract Spotify ID from URL");
    }

    const [, type, spotifyId] = urlMatch;
    
    // For now, we'll use ToneDen-compatible API structure
    // ToneDen API endpoint: https://www.toneden.io/api/v1/links
    // Note: This requires a ToneDen API key which should be added as a secret
    
    const tonedenApiKey = Deno.env.get("TONEDEN_API_KEY");
    if (!tonedenApiKey) {
      console.warn("TONEDEN_API_KEY not configured, generating placeholder link");
      // Return a placeholder smart link for now
      const placeholderLink = `https://stream.trackball.cc/${spotifyId}`;
      return new Response(JSON.stringify({ 
        smartlink: placeholderLink,
        note: "ToneDen API key not configured. This is a placeholder link."
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Call ToneDen API to create smart link
    // ToneDen API appears to require session-based auth, not Bearer token
    // For now, return placeholder until proper auth flow is implemented
    console.warn("ToneDen API requires proper OAuth2 authentication. Returning placeholder.");
    const placeholderLink = `https://stream.trackball.cc/${spotifyId}`;
    
    // Store placeholder in database
    const { error: insertError } = await supabase
      .from('smart_links')
      .insert({
        user_id: userId,
        spotify_url: spotifyUrl,
        smart_link_url: placeholderLink,
        toneden_link_id: null,
        title: `Smart Link ${spotifyId}`,
        platforms: []
      });

    if (insertError) {
      console.error("Error saving smart link to database:", insertError);
    }

    return new Response(JSON.stringify({ 
      smartlink: placeholderLink,
      platforms: [],
      created_at: new Date().toISOString(),
      note: "ToneDen integration requires OAuth2 setup. Using placeholder link."
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in generate-smartlink:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);