-- Create table for custom label dropdown banners
CREATE TABLE IF NOT EXISTS public.label_dropdown_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  banner_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(label_id)
);

-- Enable RLS
ALTER TABLE public.label_dropdown_banners ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their label's banner
CREATE POLICY "Users can view their label banner"
ON public.label_dropdown_banners
FOR SELECT
TO authenticated
USING (
  label_id IN (
    SELECT label_id FROM public.user_label_memberships WHERE user_id = auth.uid()
  )
);

-- Policy: Label owners can insert/update their label's banner
CREATE POLICY "Label owners can manage banner"
ON public.label_dropdown_banners
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_label_memberships ulm
    JOIN public.profiles p ON p.id = ulm.user_id
    WHERE ulm.user_id = auth.uid()
    AND ulm.label_id = label_dropdown_banners.label_id
    AND ulm.role = 'owner'
    AND p.label_type IN ('Label Partner', 'Label Signature', 'Label Prestige')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_label_memberships ulm
    JOIN public.profiles p ON p.id = ulm.user_id
    WHERE ulm.user_id = auth.uid()
    AND ulm.label_id = label_dropdown_banners.label_id
    AND ulm.role = 'owner'
    AND p.label_type IN ('Label Partner', 'Label Signature', 'Label Prestige')
  )
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_label_banner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_label_dropdown_banners_updated_at
BEFORE UPDATE ON public.label_dropdown_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_label_banner_updated_at();