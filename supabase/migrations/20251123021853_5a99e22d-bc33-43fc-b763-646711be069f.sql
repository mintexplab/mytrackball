-- Allow master account holders to delete subaccount profiles
CREATE POLICY "Master accounts can delete their subaccounts"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = parent_account_id);

-- Allow master account holders to delete subaccount user_roles
CREATE POLICY "Master accounts can delete subaccount roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_roles.user_id
    AND profiles.parent_account_id = auth.uid()
  )
);

-- Allow master accounts to delete all permissions they granted
CREATE POLICY "Master accounts can delete permissions they granted"
ON public.user_permissions
FOR DELETE
TO authenticated
USING (auth.uid() = granted_by);