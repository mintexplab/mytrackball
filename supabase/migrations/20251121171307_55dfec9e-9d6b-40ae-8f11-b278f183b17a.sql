-- Add is_locked field to profiles table
ALTER TABLE public.profiles ADD COLUMN is_locked boolean DEFAULT false;

-- Update RLS policy to block locked users
CREATE POLICY "Locked users cannot access data"
ON public.profiles
FOR ALL
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_locked = true
  )
);