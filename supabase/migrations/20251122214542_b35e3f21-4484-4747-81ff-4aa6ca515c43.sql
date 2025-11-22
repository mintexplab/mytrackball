-- Add service access and royalty split fields to label_invitations
ALTER TABLE public.label_invitations 
ADD COLUMN IF NOT EXISTS service_access TEXT[] DEFAULT ARRAY['catalog', 'royalties', 'announcements', 'support', 'settings']::TEXT[],
ADD COLUMN IF NOT EXISTS custom_royalty_split NUMERIC CHECK (custom_royalty_split >= 0 AND custom_royalty_split <= 100);

-- Create partner_royalty_splits table to track custom splits for partner accounts
CREATE TABLE IF NOT EXISTS public.partner_royalty_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  royalty_split_percentage NUMERIC NOT NULL CHECK (royalty_split_percentage >= 0 AND royalty_split_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on partner_royalty_splits
ALTER TABLE public.partner_royalty_splits ENABLE ROW LEVEL SECURITY;

-- Users can view their own royalty split
CREATE POLICY "Users can view their own royalty split"
ON public.partner_royalty_splits
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all royalty splits
CREATE POLICY "Admins can manage royalty splits"
ON public.partner_royalty_splits
FOR ALL
USING (has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.partner_royalty_splits IS 'Stores custom royalty split percentages for partner accounts';
COMMENT ON COLUMN public.label_invitations.service_access IS 'Array of services the partner account can access: catalog, royalties, publishing, announcements, support, settings';
COMMENT ON COLUMN public.label_invitations.custom_royalty_split IS 'Custom royalty split percentage for partner accounts (0-100)';