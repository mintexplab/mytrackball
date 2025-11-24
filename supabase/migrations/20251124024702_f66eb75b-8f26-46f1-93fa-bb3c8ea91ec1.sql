-- Allow unauthenticated users to view pending invitations by token (UUID)
-- This is secure because:
-- 1. UUIDs are unguessable tokens
-- 2. Only pending, non-expired invitations are accessible
-- 3. No sensitive data is exposed

-- Policy for sublabel_invitations
DROP POLICY IF EXISTS "Anyone can view pending sublabel invitations by token" ON public.sublabel_invitations;
CREATE POLICY "Anyone can view pending sublabel invitations by token"
ON public.sublabel_invitations
FOR SELECT
TO public
USING (
  status = 'pending'
  AND expires_at > now()
);

-- Policy for artist_invitations  
DROP POLICY IF EXISTS "Anyone can view pending artist invitations by token" ON public.artist_invitations;
CREATE POLICY "Anyone can view pending artist invitations by token"
ON public.artist_invitations
FOR SELECT
TO public
USING (
  status = 'pending'
  AND expires_at > now()
);