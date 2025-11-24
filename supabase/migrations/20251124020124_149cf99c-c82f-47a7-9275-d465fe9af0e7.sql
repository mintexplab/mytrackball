-- Add footer text customization for subdistributors
ALTER TABLE public.profiles
ADD COLUMN subdistributor_footer_text TEXT DEFAULT '© 2025 My Trackball. All rights reserved.';