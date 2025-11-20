-- Create ISRC counter table
CREATE TABLE IF NOT EXISTS public.isrc_counter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix TEXT NOT NULL DEFAULT 'CBGNR25',
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert initial counter
INSERT INTO public.isrc_counter (prefix, last_number) VALUES ('CBGNR25', 0);

-- Enable RLS on isrc_counter
ALTER TABLE public.isrc_counter ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view
CREATE POLICY "Authenticated users can view ISRC counter"
ON public.isrc_counter
FOR SELECT
TO authenticated
USING (true);

-- Policy for authenticated users to update
CREATE POLICY "Authenticated users can update ISRC counter"
ON public.isrc_counter
FOR UPDATE
TO authenticated
USING (true);

-- Add distributor field to releases table
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS distributor TEXT;

-- Create storage buckets for audio and artwork
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('release-audio', 'release-audio', false),
  ('release-artwork', 'release-artwork', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for audio bucket (private - only owner can access)
CREATE POLICY "Users can upload their own audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'release-audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'release-audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'release-audio' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policies for artwork bucket (public)
CREATE POLICY "Anyone can view artwork"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'release-artwork');

CREATE POLICY "Users can upload their own artwork"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'release-artwork' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own artwork"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'release-artwork' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add track audio field
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS audio_path TEXT;