-- Add ban_reason column to profiles table
ALTER TABLE public.profiles
ADD COLUMN ban_reason TEXT;