-- Add 2FA setup status and onboarding completion tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_setup_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_mfa_setup ON public.profiles(mfa_setup_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed);