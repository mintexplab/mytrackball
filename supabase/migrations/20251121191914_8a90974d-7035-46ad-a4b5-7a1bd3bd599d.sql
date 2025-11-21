-- Add Stripe fields to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS stripe_product_id text;

-- Update existing plans with Stripe IDs
UPDATE public.plans 
SET stripe_price_id = 'price_1SNPHfLSq9lv5snKGCE4HZ2S', 
    stripe_product_id = 'prod_TK3OfceUxqiwwe'
WHERE name = 'Trackball Lite';

UPDATE public.plans 
SET stripe_price_id = 'price_1STyK6LSq9lv5snKE6UTcFEo', 
    stripe_product_id = 'prod_TJHIxetRpzSKJ0'
WHERE name = 'Trackball Signature';

UPDATE public.plans 
SET stripe_price_id = 'price_1SUfUfLSq9lv5snKuedfRwIQ', 
    stripe_product_id = 'prod_TRYbaz1urEKznN'
WHERE name = 'Trackball Prestige';

-- Add Stripe customer ID and subscription ID to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;