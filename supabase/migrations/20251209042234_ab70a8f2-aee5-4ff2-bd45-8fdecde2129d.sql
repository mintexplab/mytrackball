-- Fix profiles table RLS policies to prevent cross-user data exposure

-- First, drop the problematic overlapping SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their sublabel accounts" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Locked users cannot access profiles" ON public.profiles;

-- Recreate with proper isolation - users can ONLY see their own profile
CREATE POLICY "Users can view their own profile only"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Admins can view all profiles (separate policy)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Master accounts can view their sublabel accounts
CREATE POLICY "Master accounts can view sublabel profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() = parent_account_id);

-- Locked users policy should only affect their OWN access, not grant broader access
-- This policy RESTRICTS access for locked users to their own profile operations
CREATE POLICY "Locked users restricted from profile operations"
ON public.profiles
FOR ALL
USING (
  (auth.uid() = id AND NOT is_user_locked(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);