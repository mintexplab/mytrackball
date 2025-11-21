-- Add account manager fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN account_manager_name text,
ADD COLUMN account_manager_email text,
ADD COLUMN account_manager_phone text,
ADD COLUMN account_manager_timezone text DEFAULT 'America/New_York',
ADD COLUMN user_timezone text DEFAULT 'America/New_York';