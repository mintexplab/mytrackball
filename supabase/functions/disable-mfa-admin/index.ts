import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the requesting user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // Verify user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (rolesError || !roles) {
      throw new Error('Unauthorized - admin only');
    }

    // Get all MFA factors for the user
    const { data: factors, error: factorsError } = await supabaseAdmin.auth.admin.mfa.listFactors({
      userId: user.id
    });

    if (factorsError) {
      throw factorsError;
    }

    // Delete all MFA factors using admin privileges
    const deletionResults = [];
    if (factors && factors.factors) {
      for (const factor of factors.factors) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
          id: factor.id,
          userId: user.id
        });
        
        if (deleteError) {
          console.error(`Error deleting factor ${factor.id}:`, deleteError);
          deletionResults.push({ factorId: factor.id, success: false, error: deleteError.message });
        } else {
          deletionResults.push({ factorId: factor.id, success: true });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'MFA disabled successfully',
        factorsRemoved: deletionResults.filter(r => r.success).length,
        results: deletionResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
