-- Create app_settings table to store version and other app-wide settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read app settings
CREATE POLICY "Anyone can view app settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- Only admins can update app settings
CREATE POLICY "Only admins can update app settings"
  ON public.app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert initial version number
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('version', '1.16.0')
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger to update timestamp
CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_app_settings_timestamp
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_settings_updated_at();