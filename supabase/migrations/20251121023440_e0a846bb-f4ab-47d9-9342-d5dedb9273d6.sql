-- Add banned status to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Create RLS policy to prevent banned users from accessing data
CREATE POLICY "Banned users cannot access data" ON public.releases
FOR ALL
USING (
  NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_banned = true
  )
);

-- Allow admins to update user banned status
CREATE POLICY "Admins can update user banned status" ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));