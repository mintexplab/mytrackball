-- Update profiles to better support label hierarchy
-- Add artist_name field to distinguish from label_name
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS artist_name TEXT;

-- Update existing profiles: copy display_name to artist_name if label_name exists
UPDATE public.profiles 
SET artist_name = display_name 
WHERE label_name IS NOT NULL AND artist_name IS NULL;

COMMENT ON COLUMN public.profiles.label_name IS 'The label/company name (shared across affiliated accounts)';
COMMENT ON COLUMN public.profiles.artist_name IS 'The individual artist/user name within the label';
COMMENT ON COLUMN public.profiles.display_name IS 'Display name shown in UI (can be artist_name or label_name)';
COMMENT ON COLUMN public.profiles.parent_account_id IS 'Links client accounts to their parent label account';