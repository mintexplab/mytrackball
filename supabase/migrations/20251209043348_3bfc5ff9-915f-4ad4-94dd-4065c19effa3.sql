-- Update releases_status_check constraint to include all valid statuses used in the application
ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS releases_status_check;

ALTER TABLE public.releases ADD CONSTRAINT releases_status_check 
CHECK (
  status IS NULL OR status = ANY (ARRAY[
    'pending'::text, 
    'pending_payment'::text, 
    'pay_later'::text,
    'paid'::text,
    'processing'::text,
    'approved'::text, 
    'rejected'::text, 
    'published'::text, 
    'delivering'::text, 
    'delivered'::text,
    'taken down'::text, 
    'striked'::text, 
    'on hold'::text, 
    'awaiting final qc'::text
  ])
);