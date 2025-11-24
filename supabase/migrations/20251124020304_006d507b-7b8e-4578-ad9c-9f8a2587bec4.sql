-- Update default footer text for subdistributors
ALTER TABLE public.profiles
ALTER COLUMN subdistributor_footer_text SET DEFAULT '© 2025 XZ1 Recording Ventures. All rights reserved.';