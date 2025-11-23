-- Add column to track subscription welcome dialog
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_welcome_shown_at timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN public.profiles.subscription_welcome_shown_at IS 'Timestamp when subscription welcome dialog was last shown to user';