-- Allow subdistributor masters to create artist invitations
CREATE POLICY "Subdistributor masters can create artist invitations"
ON public.artist_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = invited_by 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_subdistributor_master = true
  )
);