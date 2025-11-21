-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Locked users cannot access data" ON public.profiles;

-- Create a security definer function to check if user is locked
CREATE OR REPLACE FUNCTION public.is_user_locked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_locked FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Create new policy using the security definer function
CREATE POLICY "Locked users cannot access profiles" ON public.profiles
FOR ALL
USING (NOT public.is_user_locked(auth.uid()));

-- Apply the same policy to releases table
DROP POLICY IF EXISTS "Locked users cannot access releases" ON public.releases;

CREATE POLICY "Locked users cannot access releases" ON public.releases
FOR ALL
USING (NOT public.is_user_locked(auth.uid()));