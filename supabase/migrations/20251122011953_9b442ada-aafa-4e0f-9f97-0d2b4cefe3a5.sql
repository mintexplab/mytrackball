-- Add catalog_number column to releases table
ALTER TABLE public.releases
ADD COLUMN IF NOT EXISTS catalog_number text;

-- No changes to RLS needed; column is additional metadata only.