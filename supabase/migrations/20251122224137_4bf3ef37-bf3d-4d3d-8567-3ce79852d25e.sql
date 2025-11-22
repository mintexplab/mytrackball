-- Add invited_role field to label_invitations table for role-based invitations
ALTER TABLE public.label_invitations
ADD COLUMN IF NOT EXISTS invited_role TEXT DEFAULT 'member' CHECK (invited_role IN ('owner', 'sublabel_admin', 'member'));

-- Add comment for clarity
COMMENT ON COLUMN public.label_invitations.invited_role IS 'Role assigned to invitee when they accept: owner (master), sublabel_admin, or member';