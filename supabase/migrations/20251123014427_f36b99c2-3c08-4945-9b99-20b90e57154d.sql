-- Allow users to view permissions they have granted to others
CREATE POLICY "Users can view permissions they granted"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = granted_by);