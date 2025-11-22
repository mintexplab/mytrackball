-- Allow users to have permissions granted to them by others
CREATE POLICY "Users can receive granted permissions"
ON public.user_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  granted_by IS NOT NULL 
  AND granted_by != auth.uid()
  AND auth.uid() = user_id
);