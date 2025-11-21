-- Create subdistributor_invitations table
CREATE TABLE IF NOT EXISTS public.subdistributor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdistributor_id UUID NOT NULL REFERENCES public.subdistributors(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  primary_color TEXT NOT NULL,
  background_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.subdistributor_invitations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view invitations by token (needed for signup page)
CREATE POLICY "Anyone can view invitations by token"
  ON public.subdistributor_invitations
  FOR SELECT
  USING (true);

-- Allow anyone to update invitation status (needed for acceptance flow)
CREATE POLICY "Anyone can update invitation status"
  ON public.subdistributor_invitations
  FOR UPDATE
  USING (true);

-- Admins can manage all invitations
CREATE POLICY "Admins can manage subdistributor invitations"
  ON public.subdistributor_invitations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_subdistributor_invitations_token 
  ON public.subdistributor_invitations(invitation_token);

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_subdistributor_invitations_status 
  ON public.subdistributor_invitations(status);