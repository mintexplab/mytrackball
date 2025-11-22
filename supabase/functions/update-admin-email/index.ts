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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get and validate the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract JWT token and verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !requestingUser) {
      throw new Error('Not authenticated');
    }

    // Check if requesting user is admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    const isAdmin = roles?.some(r => r.role === 'admin');

    if (!isAdmin) {
      throw new Error('Unauthorized: Only admins can update emails');
    }

    const { newEmail } = await req.json();
    
    if (!newEmail) {
      throw new Error('newEmail is required');
    }

    // Update the user's email using admin API with email_confirm set to true to skip verification
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      requestingUser.id,
      { 
        email: newEmail,
        email_confirm: true  // This bypasses email verification
      }
    );

    if (updateError) {
      throw updateError;
    }

    // Update the profile table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: newEmail })
      .eq('user_id', requestingUser.id);

    if (profileError) {
      throw profileError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email updated to ${newEmail}`,
        userId: requestingUser.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error updating email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
