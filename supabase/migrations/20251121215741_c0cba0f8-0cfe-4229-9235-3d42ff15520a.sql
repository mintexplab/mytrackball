-- Remove subdistributor-related RLS policies
DROP POLICY IF EXISTS "Subdistributor admins can view their users" ON profiles;
DROP POLICY IF EXISTS "Subdistributor admins can view their releases" ON releases;
DROP POLICY IF EXISTS "Subdistributor admins can manage their releases" ON releases;
DROP POLICY IF EXISTS "Subdistributor admins can create notifications for their users" ON notifications;
DROP POLICY IF EXISTS "Subdistributor admins can view their users notifications" ON notifications;
DROP POLICY IF EXISTS "Subdistributor admins can manage their royalties" ON royalties;
DROP POLICY IF EXISTS "Subdistributor admins can view their royalties" ON royalties;
DROP POLICY IF EXISTS "Subdistributor admins can manage their payout requests" ON payout_requests;
DROP POLICY IF EXISTS "Subdistributor admins can view their payout requests" ON payout_requests;
DROP POLICY IF EXISTS "Admins can manage subdistributor invitations" ON subdistributor_invitations;
DROP POLICY IF EXISTS "Anyone can update invitation status" ON subdistributor_invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON subdistributor_invitations;
DROP POLICY IF EXISTS "Admins can manage subdistributors" ON subdistributors;
DROP POLICY IF EXISTS "Owners can view their subdistributor" ON subdistributors;
DROP POLICY IF EXISTS "Users can view their subdistributor" ON subdistributors;

-- Delete any user_roles with subdistributor_admin role
DELETE FROM user_roles WHERE role = 'subdistributor_admin';

-- Drop subdistributor_invitations table (has FK to subdistributors)
DROP TABLE IF EXISTS subdistributor_invitations CASCADE;

-- Remove subdistributor_id from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS subdistributor_id CASCADE;

-- Drop subdistributors table
DROP TABLE IF EXISTS subdistributors CASCADE;