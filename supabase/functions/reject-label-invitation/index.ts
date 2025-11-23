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
    );

    // Get and validate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    const { invitationId } = await req.json();
    
    if (!invitationId) {
      throw new Error('Invitation ID is required');
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('label_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation has already been processed');
    }

    // Verify this invitation is for the current user
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const isForThisUser = 
      profile.email === invitation.master_account_email ||
      invitation.additional_users?.includes(profile.email);

    if (!isForThisUser) {
      throw new Error('This invitation is not for you');
    }

    // Mark invitation as rejected
    const { error: updateError } = await supabaseAdmin
      .from('label_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitationId);

    if (updateError) throw updateError;

    console.log(`Invitation ${invitationId} rejected by user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation rejected' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error rejecting invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to reject invitation' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});