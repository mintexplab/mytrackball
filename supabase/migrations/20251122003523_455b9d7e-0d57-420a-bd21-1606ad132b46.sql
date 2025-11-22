-- Fix RLS policies to secure sensitive data

-- 1. FIX PROFILES TABLE - Remove public read access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Only allow users to view their own profile and admins to view all
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 2. FIX RELEASES TABLE - Remove public read access
DROP POLICY IF EXISTS "Anyone can view releases" ON public.releases;
DROP POLICY IF EXISTS "Public can view releases" ON public.releases;

-- Only release owner, their clients (via permissions), and admins can view releases
CREATE POLICY "Users can view own releases"
ON public.releases
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid() 
    AND up.permission = 'catalog'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = up.granted_by
      AND p.id = releases.user_id
    )
  )
);

-- 3. FIX APP_SETTINGS TABLE - Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;

-- Only authenticated users can view app settings
CREATE POLICY "Authenticated users can view app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- 4. FIX PLANS TABLE - Keep readable but add note about consideration
-- Plans table can remain public as pricing is typically public information
-- However, if you want to restrict it to authenticated users only:
DROP POLICY IF EXISTS "Anyone can view plans" ON public.plans;

CREATE POLICY "Authenticated users can view plans"
ON public.plans
FOR SELECT
TO authenticated
USING (true);