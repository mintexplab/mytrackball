-- Add soft delete/archive support to releases table
ALTER TABLE public.releases 
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for archived releases
CREATE INDEX idx_releases_archived_at ON public.releases(archived_at);

-- Add comment explaining the field
COMMENT ON COLUMN public.releases.archived_at IS 'When set, marks release as archived (soft deleted). NULL means active.';