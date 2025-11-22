-- Update releases status check constraint to allow extended set of statuses
ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS releases_status_check;

ALTER TABLE public.releases
ADD CONSTRAINT releases_status_check
CHECK (
  status IS NULL OR status IN (
    'pending',
    'approved',
    'rejected',
    'published',
    'delivering',
    'taken down',
    'striked',
    'on hold',
    'awaiting final qc'
  )
);