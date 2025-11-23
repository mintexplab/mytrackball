import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmartLinkRequest {
  spotifyUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spotifyUrl }: SmartLinkRequest = await req.json();

    console.log("Generating smart link for:", spotifyUrl);

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
    // Based on ToneDen API docs: https://www.toneden.io/api/v1/links
    const tonedenResponse = await fetch("https://www.toneden.io/api/v1/links", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "Authorization": `Bearer ${tonedenApiKey}`, // Try Bearer auth first
      },
      body: JSON.stringify({
        target_type: "music", // Assuming 'music' for Spotify links
        custom_domain: "stream.trackball.cc",
        title: `Smart Link for ${spotifyId}`,
        // Add the Spotify URL as target or in services
        services: [{
          name: "Spotify",
          url: spotifyUrl
        }]
      }),
    });

    if (!tonedenResponse.ok) {
      const errorData = await tonedenResponse.text();
      console.error("ToneDen API error status:", tonedenResponse.status);
      console.error("ToneDen API error response:", errorData);
      console.error("ToneDen API request body was:", JSON.stringify({
        target_type: "music",
        custom_domain: "stream.trackball.cc",
        title: `Smart Link for ${spotifyId}`,
        services: [{ name: "Spotify", url: spotifyUrl }]
      }));
      
      // Fallback to placeholder smart link instead of failing the whole request
      const fallbackLink = `https://stream.trackball.cc/${spotifyId}`;
      return new Response(JSON.stringify({
        smartlink: fallbackLink,
        platforms: [],
        note: "ToneDen API call failed. Returning fallback smart link. Check logs for details.",
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const tonedenData = await tonedenResponse.json();
    console.log("ToneDen response:", tonedenData);

    // ToneDen returns a smart link URL
    const smartlink = tonedenData.url || tonedenData.link || `https://stream.trackball.cc/${spotifyId}`;

    return new Response(JSON.stringify({ 
      smartlink,
      platforms: tonedenData.platforms || [],
      created_at: new Date().toISOString()
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