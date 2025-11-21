-- Create profile pictures storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for profile pictures
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);