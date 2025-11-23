-- Allow users to delete invitations they created
CREATE POLICY "Users can delete invitations they sent"
ON public.sublabel_invitations
FOR DELETE
TO authenticated
USING (auth.uid() = inviter_id);