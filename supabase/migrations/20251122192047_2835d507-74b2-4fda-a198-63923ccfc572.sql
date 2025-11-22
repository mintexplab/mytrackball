-- Remove Supabase storage buckets since all files now use S3

-- Drop storage policies first
DROP POLICY IF EXISTS "Public read access for email assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload email assets" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

-- Delete all objects from buckets first
DELETE FROM storage.objects WHERE bucket_id IN ('email-assets', 'profile-pictures', 'release-artwork', 'release-audio');

-- Then delete the buckets
DELETE FROM storage.buckets WHERE id IN ('email-assets', 'profile-pictures', 'release-artwork', 'release-audio');