-- Create permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('catalog', 'royalties', 'announcements', 'support', 'settings')),
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "Admins can manage all permissions"
ON public.user_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Update sublabel_invitations to include permissions
ALTER TABLE public.sublabel_invitations 
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add parent_user_id to track who's inviting (for client accounts)
ALTER TABLE public.sublabel_invitations 
ADD COLUMN IF NOT EXISTS invitation_type TEXT DEFAULT 'sublabel' CHECK (invitation_type IN ('sublabel', 'client'));

COMMENT ON TABLE public.user_permissions IS 'Stores granular permissions for users to access specific features';
COMMENT ON COLUMN public.sublabel_invitations.permissions IS 'Array of permissions granted with invitation: catalog, royalties, announcements, support, settings';
COMMENT ON COLUMN public.sublabel_invitations.invitation_type IS 'Type of invitation: sublabel (for Signature/Prestige) or client (general invitation with permissions)';