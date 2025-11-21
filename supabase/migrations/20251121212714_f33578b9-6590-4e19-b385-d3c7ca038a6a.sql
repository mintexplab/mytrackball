-- Add RLS policies to isolate subdistributor data

-- Subdistributor admins can only view users in their subdistributor
CREATE POLICY "Subdistributor admins can view their users"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'subdistributor_admin'
    AND p.subdistributor_id = profiles.subdistributor_id
  )
);

-- Subdistributor admins can only view releases from their users
CREATE POLICY "Subdistributor admins can view their releases"
ON public.releases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.user_roles ur ON admin_profile.id = ur.user_id
    JOIN public.profiles user_profile ON user_profile.subdistributor_id = admin_profile.subdistributor_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'subdistributor_admin'
    AND releases.user_id = user_profile.id
  )
);

-- Subdistributor admins can manage releases from their users
CREATE POLICY "Subdistributor admins can manage their releases"
ON public.releases
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.user_roles ur ON admin_profile.id = ur.user_id
    JOIN public.profiles user_profile ON user_profile.subdistributor_id = admin_profile.subdistributor_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'subdistributor_admin'
    AND releases.user_id = user_profile.id
  )
);

-- Subdistributor admins can view royalties for their users
CREATE POLICY "Subdistributor admins can view their royalties"
ON public.royalties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.user_roles ur ON admin_profile.id = ur.user_id
    JOIN public.profiles user_profile ON user_profile.subdistributor_id = admin_profile.subdistributor_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'subdistributor_admin'
    AND royalties.user_id = user_profile.id
  )
);

-- Subdistributor admins can manage royalties for their users
CREATE POLICY "Subdistributor admins can manage their royalties"
ON public.royalties
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.user_roles ur ON admin_profile.id = ur.user_id
    JOIN public.profiles user_profile ON user_profile.subdistributor_id = admin_profile.subdistributor_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'subdistributor_admin'
    AND royalties.user_id = user_profile.id
  )
);

-- Subdistributor admins can view payout requests for their users
CREATE POLICY "Subdistributor admins can view their payout requests"
ON public.payout_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.user_roles ur ON admin_profile.id = ur.user_id
    JOIN public.profiles user_profile ON user_profile.subdistributor_id = admin_profile.subdistributor_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'subdistributor_admin'
    AND payout_requests.user_id = user_profile.id
  )
);

-- Subdistributor admins can manage payout requests for their users
CREATE POLICY "Subdistributor admins can manage their payout requests"
ON public.payout_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.user_roles ur ON admin_profile.id = ur.user_id
    JOIN public.profiles user_profile ON user_profile.subdistributor_id = admin_profile.subdistributor_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'subdistributor_admin'
    AND payout_requests.user_id = user_profile.id
  )
);

-- Subdistributor admins can view notifications for their users
CREATE POLICY "Subdistributor admins can view their users notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.user_roles ur ON admin_profile.id = ur.user_id
    JOIN public.profiles user_profile ON user_profile.subdistributor_id = admin_profile.subdistributor_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'subdistributor_admin'
    AND notifications.user_id = user_profile.id
  )
);

-- Subdistributor admins can create notifications for their users
CREATE POLICY "Subdistributor admins can create notifications for their users"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.user_roles ur ON admin_profile.id = ur.user_id
    JOIN public.profiles user_profile ON user_profile.subdistributor_id = admin_profile.subdistributor_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'subdistributor_admin'
    AND notifications.user_id = user_profile.id
  )
);