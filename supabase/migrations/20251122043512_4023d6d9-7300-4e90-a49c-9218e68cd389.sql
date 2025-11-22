-- Create maintenance_settings table
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage maintenance settings
CREATE POLICY "Admins can manage maintenance settings"
  ON public.maintenance_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Allow authenticated users to view maintenance settings
CREATE POLICY "Users can view maintenance settings"
  ON public.maintenance_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_maintenance_settings_updated_at
  BEFORE UPDATE ON public.maintenance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();