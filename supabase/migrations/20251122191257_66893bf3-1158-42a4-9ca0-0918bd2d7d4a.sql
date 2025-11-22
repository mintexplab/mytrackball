-- Create public email-assets bucket for email images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-assets',
  'email-assets',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Public read access for email assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload email assets" ON storage.objects;

-- Allow public read access to email assets
CREATE POLICY "Public read access for email assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

-- Allow authenticated users to upload email assets
CREATE POLICY "Authenticated users can upload email assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'authenticated');