-- Add payment_status column to releases table
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

-- Add comment for clarity
COMMENT ON COLUMN public.releases.payment_status IS 'Payment status: unpaid, paid, pay_later';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_releases_payment_status ON public.releases(payment_status);