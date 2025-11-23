-- Add label_type column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS label_type TEXT 
CHECK (label_type IN ('partner_label', 'signature_label', 'prestige_label'));

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.label_type IS 'Label designation: partner_label (partner deal), signature_label (Signature plan), prestige_label (Prestige plan)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_label_type ON public.profiles(label_type) WHERE label_type IS NOT NULL;