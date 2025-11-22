-- Add announcement bar table for site-wide banner announcements
CREATE TABLE IF NOT EXISTS public.announcement_bar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  button_text TEXT,
  button_link TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.announcement_bar ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage announcement bar
CREATE POLICY "Admins can manage announcement bar"
ON public.announcement_bar
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow all authenticated users to view active announcement bar
CREATE POLICY "Users can view active announcement bar"
ON public.announcement_bar
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_announcement_bar_updated_at
BEFORE UPDATE ON public.announcement_bar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();