-- Add label_id column to sublabel_invitations table
ALTER TABLE public.sublabel_invitations
ADD COLUMN label_id uuid REFERENCES public.labels(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_sublabel_invitations_label_id ON public.sublabel_invitations(label_id);