-- Fix infinite recursion in profiles RLS policy by removing recursive policy
DROP POLICY "Sublabel accounts can view their parent" ON public.profiles;