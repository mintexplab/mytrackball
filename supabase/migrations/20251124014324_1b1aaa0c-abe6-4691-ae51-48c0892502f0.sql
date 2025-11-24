-- Add subdistributor customization fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_subdistributor_master BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subdistributor_dashboard_name TEXT DEFAULT 'My Trackball',
ADD COLUMN IF NOT EXISTS subdistributor_logo_url TEXT,
ADD COLUMN IF NOT EXISTS subdistributor_accent_color TEXT DEFAULT '#ef4444';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subdistributor ON public.profiles(is_subdistributor_master) WHERE is_subdistributor_master = true;

-- Create RLS policy to allow subdistributor masters to update their own customization
CREATE POLICY "Subdistributor masters can update their customization"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id 
  AND is_subdistributor_master = true
)
WITH CHECK (
  auth.uid() = id 
  AND is_subdistributor_master = true
);

-- Ensure only admins can set subdistributor status
CREATE POLICY "Only admins can set subdistributor status"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

COMMENT ON COLUMN public.profiles.is_subdistributor_master IS 'Whether this account is a subdistributor master account with full platform customization';
COMMENT ON COLUMN public.profiles.subdistributor_dashboard_name IS 'Custom dashboard name for subdistributor (e.g., "My Label Distribution")';
COMMENT ON COLUMN public.profiles.subdistributor_logo_url IS 'Custom logo URL for subdistributor dashboard';
COMMENT ON COLUMN public.profiles.subdistributor_accent_color IS 'Custom accent color for subdistributor organization';