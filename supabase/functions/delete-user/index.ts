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

    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`[DELETE-USER] Attempting to delete user: ${userId}`);

    // Check if requesting user is admin, deleting their own account, or deleting a subaccount
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    const isSelfDelete = requestingUser.id === userId;

    // Check if the target user is a subaccount of the requesting user
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('parent_account_id')
      .eq('id', userId)
      .single();

    const isMasterAccount = targetProfile?.parent_account_id === requestingUser.id;

    if (!isAdmin && !isSelfDelete && !isMasterAccount) {
      throw new Error('Unauthorized: Only admins or master accounts can delete subaccounts');
    }

    console.log(`[DELETE-USER] Authorization passed. Deleting related records...`);

    // Delete related records in order to avoid foreign key constraint violations
    // Order matters due to dependencies!

    // 1. Delete user fines
    const { error: finesError } = await supabaseAdmin
      .from('user_fines')
      .delete()
      .eq('user_id', userId);
    if (finesError) console.log(`[DELETE-USER] Error deleting fines:`, finesError.message);

    // 2. Delete user notifications
    const { error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (notificationsError) console.log(`[DELETE-USER] Error deleting notifications:`, notificationsError.message);

    // 3. Delete user announcement views
    const { error: announcementViewsError } = await supabaseAdmin
      .from('user_announcement_views')
      .delete()
      .eq('user_id', userId);
    if (announcementViewsError) console.log(`[DELETE-USER] Error deleting announcement views:`, announcementViewsError.message);

    // 4. Delete payout requests
    const { error: payoutError } = await supabaseAdmin
      .from('payout_requests')
      .delete()
      .eq('user_id', userId);
    if (payoutError) console.log(`[DELETE-USER] Error deleting payout requests:`, payoutError.message);

    // 5. Delete royalties
    const { error: royaltiesError } = await supabaseAdmin
      .from('royalties')
      .delete()
      .eq('user_id', userId);
    if (royaltiesError) console.log(`[DELETE-USER] Error deleting royalties:`, royaltiesError.message);

    // 6. Delete collaborators
    const { error: collaboratorsError } = await supabaseAdmin
      .from('collaborators')
      .delete()
      .eq('user_id', userId);
    if (collaboratorsError) console.log(`[DELETE-USER] Error deleting collaborators:`, collaboratorsError.message);

    // 7. Delete ticket messages for user's tickets
    const { data: userTickets } = await supabaseAdmin
      .from('support_tickets')
      .select('id')
      .eq('user_id', userId);
    
    if (userTickets && userTickets.length > 0) {
      for (const ticket of userTickets) {
        await supabaseAdmin
          .from('ticket_messages')
          .delete()
          .eq('ticket_id', ticket.id);
      }
    }

    // 8. Delete support tickets
    const { error: ticketsError } = await supabaseAdmin
      .from('support_tickets')
      .delete()
      .eq('user_id', userId);
    if (ticketsError) console.log(`[DELETE-USER] Error deleting support tickets:`, ticketsError.message);

    // 9. Delete publishing submissions
    const { error: publishingError } = await supabaseAdmin
      .from('publishing_submissions')
      .delete()
      .eq('user_id', userId);
    if (publishingError) console.log(`[DELETE-USER] Error deleting publishing submissions:`, publishingError.message);

    // 10. Delete smart links
    const { error: smartLinksError } = await supabaseAdmin
      .from('smart_links')
      .delete()
      .eq('user_id', userId);
    if (smartLinksError) console.log(`[DELETE-USER] Error deleting smart links:`, smartLinksError.message);

    // 11. Delete user label memberships
    const { error: membershipError } = await supabaseAdmin
      .from('user_label_memberships')
      .delete()
      .eq('user_id', userId);
    if (membershipError) console.log(`[DELETE-USER] Error deleting label memberships:`, membershipError.message);

    // 12. Delete user permissions
    const { error: permissionsError } = await supabaseAdmin
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);
    if (permissionsError) console.log(`[DELETE-USER] Error deleting user permissions:`, permissionsError.message);

    // 13. Delete partner royalty splits
    const { error: splitsError } = await supabaseAdmin
      .from('partner_royalty_splits')
      .delete()
      .eq('user_id', userId);
    if (splitsError) console.log(`[DELETE-USER] Error deleting partner splits:`, splitsError.message);

    // 14. Delete partner audit logs
    const { error: auditError } = await supabaseAdmin
      .from('partner_audit_log')
      .delete()
      .eq('user_id', userId);
    if (auditError) console.log(`[DELETE-USER] Error deleting audit logs:`, auditError.message);

    // 15. Delete account appeals
    const { error: appealsError } = await supabaseAdmin
      .from('account_appeals')
      .delete()
      .eq('user_id', userId);
    if (appealsError) console.log(`[DELETE-USER] Error deleting account appeals:`, appealsError.message);

    // 16. Get user's releases for cleanup
    const { data: userReleases } = await supabaseAdmin
      .from('releases')
      .select('id')
      .eq('user_id', userId);

    if (userReleases && userReleases.length > 0) {
      for (const release of userReleases) {
        // Delete tracks for this release
        await supabaseAdmin
          .from('tracks')
          .delete()
          .eq('release_id', release.id);

        // Delete release collaborators
        await supabaseAdmin
          .from('release_collaborators')
          .delete()
          .eq('release_id', release.id);

        // Delete distribution logs
        await supabaseAdmin
          .from('distribution_logs')
          .delete()
          .eq('release_id', release.id);
      }
    }

    // 17. Delete releases
    const { error: releasesError } = await supabaseAdmin
      .from('releases')
      .delete()
      .eq('user_id', userId);
    if (releasesError) console.log(`[DELETE-USER] Error deleting releases:`, releasesError.message);

    // 18. Delete sublabel invitations sent by this user
    const { error: sublabelInvitesError } = await supabaseAdmin
      .from('sublabel_invitations')
      .delete()
      .eq('inviter_id', userId);
    if (sublabelInvitesError) console.log(`[DELETE-USER] Error deleting sublabel invitations:`, sublabelInvitesError.message);

    // 19. Delete user plans
    const { error: userPlansError } = await supabaseAdmin
      .from('user_plans')
      .delete()
      .eq('user_id', userId);
    if (userPlansError) console.log(`[DELETE-USER] Error deleting user plans:`, userPlansError.message);

    // 20. Delete user roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (rolesError) console.log(`[DELETE-USER] Error deleting user roles:`, rolesError.message);

    // 21. Delete labels owned by user
    const { data: userLabels } = await supabaseAdmin
      .from('labels')
      .select('id')
      .eq('user_id', userId);

    if (userLabels && userLabels.length > 0) {
      for (const label of userLabels) {
        // Delete label dropdown banners
        await supabaseAdmin
          .from('label_dropdown_banners')
          .delete()
          .eq('label_id', label.id);
      }
    }

    // 22. Delete labels
    const { error: labelsError } = await supabaseAdmin
      .from('labels')
      .delete()
      .eq('user_id', userId);
    if (labelsError) console.log(`[DELETE-USER] Error deleting labels:`, labelsError.message);

    // 23. Finally, delete the profile (this must be last before auth user)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileError) console.log(`[DELETE-USER] Error deleting profile:`, profileError.message);

    console.log(`[DELETE-USER] Related records deleted. Now deleting auth user...`);

    // Delete the user using admin client
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error(`[DELETE-USER] Auth delete error:`, deleteError);
      throw deleteError;
    }

    console.log(`[DELETE-USER] User ${userId} deleted successfully`);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[DELETE-USER] Error:', error);
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
