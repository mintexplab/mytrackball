-- Add customization columns to labels table
ALTER TABLE public.labels 
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#ef4444',
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update RLS policies to allow users to update their label customizations
-- (existing policies already cover this, but let's make sure)

-- Create index for faster label lookups
CREATE INDEX IF NOT EXISTS idx_labels_user_id ON public.labels(user_id);