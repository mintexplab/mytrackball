-- Add INSERT policy for users to create their own label memberships
CREATE POLICY "Users can create their own label memberships"
ON public.user_label_memberships
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for label owners to update their label memberships
CREATE POLICY "Label owners can update their label memberships"
ON public.user_label_memberships
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id AND role = 'owner'
);

-- Add DELETE policy for users to delete their own memberships
CREATE POLICY "Users can delete their own label memberships"
ON public.user_label_memberships
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);