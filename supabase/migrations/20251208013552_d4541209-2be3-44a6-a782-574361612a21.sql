-- Drop existing constraint and add pending_payment status
ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS releases_status_check;

ALTER TABLE public.releases ADD CONSTRAINT releases_status_check 
CHECK (status IS NULL OR status = ANY (ARRAY[
  'pending'::text, 
  'pending_payment'::text,
  'approved'::text, 
  'rejected'::text, 
  'published'::text, 
  'delivering'::text, 
  'taken down'::text, 
  'striked'::text, 
  'on hold'::text, 
  'awaiting final qc'::text
]));