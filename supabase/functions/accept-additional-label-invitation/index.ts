import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptInvitationRequest {
  invitationId: string;
}

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
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    const { invitationId }: AcceptInvitationRequest = await req.json();
    
    if (!invitationId) {
      throw new Error('Invitation ID is required');
    }

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('label_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation has already been used or expired');
    }

    // Check if invitation email matches user's email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const isForThisUser = 
      profile.email === invitation.master_account_email ||
      invitation.additional_users?.includes(profile.email);

    if (!isForThisUser) {
      throw new Error('This invitation is not for your email address');
    }

    // Get or create label
    let { data: labelData } = await supabaseAdmin
      .from('labels')
      .select('id')
      .eq('name', invitation.label_name)
      .maybeSingle();

    let labelId = labelData?.id;

    if (!labelId) {
      // Create new label
      const { data: newLabel, error: createLabelError } = await supabaseAdmin
        .from('labels')
        .insert({
          name: invitation.label_name,
          user_id: profile.id,
        })
        .select()
        .single();

      if (createLabelError) throw createLabelError;
      labelId = newLabel.id;
    }

    // Check if membership already exists
    const { data: existingMembership } = await supabaseAdmin
      .from('user_label_memberships')
      .select('id')
      .eq('user_id', profile.id)
      .eq('label_id', labelId)
      .maybeSingle();

    if (existingMembership) {
      throw new Error('You are already a member of this label');
    }

    // Create label membership
    const isOwner = profile.email === invitation.master_account_email;
    const { error: membershipError } = await supabaseAdmin
      .from('user_label_memberships')
      .insert({
        user_id: profile.id,
        label_id: labelId,
        label_name: invitation.label_name,
        role: isOwner ? 'owner' : 'member',
      });

    if (membershipError) throw membershipError;

    // If this is for partner tier and they're the owner, handle plan and royalty split
    if (isOwner && invitation.subscription_tier === 'Trackball Partner') {
      // Get the plan
      const { data: planData } = await supabaseAdmin
        .from('plans')
        .select('id, name')
        .eq('name', 'Trackball Partner')
        .single();

      if (planData) {
        // Check if user already has an active plan
        const { data: existingPlan } = await supabaseAdmin
          .from('user_plans')
          .select('id')
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .maybeSingle();

        // Only assign plan if they don't have one
        if (!existingPlan) {
          await supabaseAdmin
            .from('user_plans')
            .insert({
              user_id: profile.id,
              plan_id: planData.id,
              plan_name: planData.name,
              status: 'active',
            });
        }
      }

      // Store custom royalty split if provided
      if (invitation.custom_royalty_split) {
        // Check if already exists
        const { data: existingSplit } = await supabaseAdmin
          .from('partner_royalty_splits')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (!existingSplit) {
          await supabaseAdmin
            .from('partner_royalty_splits')
            .insert({
              user_id: profile.id,
              royalty_split_percentage: invitation.custom_royalty_split
            });
        }
      }
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('label_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Label invitation accepted successfully',
        labelId: labelId,
        labelName: invitation.label_name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to accept invitation' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
