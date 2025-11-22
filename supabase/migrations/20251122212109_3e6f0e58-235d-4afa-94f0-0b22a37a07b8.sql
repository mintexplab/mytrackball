-- Add label_name column to releases table
ALTER TABLE public.releases
ADD COLUMN IF NOT EXISTS label_name TEXT;