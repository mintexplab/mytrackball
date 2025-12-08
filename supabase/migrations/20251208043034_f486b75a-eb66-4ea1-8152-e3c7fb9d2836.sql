-- Add terms acceptance columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS terms_version TEXT,
ADD COLUMN IF NOT EXISTS terms_signature_url TEXT;

-- Create storage bucket for signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for signatures bucket - users can upload their own signature
CREATE POLICY "Users can upload their own signature"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own signature
CREATE POLICY "Users can view their own signature"
ON storage.objects
FOR SELECT
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all signatures
CREATE POLICY "Admins can view all signatures"
ON storage.objects
FOR SELECT
USING (bucket_id = 'signatures' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));