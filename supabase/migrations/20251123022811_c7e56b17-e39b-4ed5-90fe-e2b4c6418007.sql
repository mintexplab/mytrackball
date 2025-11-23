-- Add field to track if user has seen label designation welcome dialog
ALTER TABLE public.profiles
ADD COLUMN label_designation_welcome_shown BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_profiles_label_designation_welcome ON public.profiles(label_designation_welcome_shown) WHERE label_designation_welcome_shown = false;