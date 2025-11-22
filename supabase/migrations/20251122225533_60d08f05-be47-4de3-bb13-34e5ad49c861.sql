-- Add account_type column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('artist', 'label', 'pending'));

-- Set default to pending for new users
ALTER TABLE public.profiles 
ALTER COLUMN account_type SET DEFAULT 'pending';

-- Update existing users to artist by default
UPDATE public.profiles 
SET account_type = 'artist' 
WHERE account_type IS NULL;