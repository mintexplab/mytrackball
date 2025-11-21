-- Create sublabel invitations table
CREATE TABLE public.sublabel_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
);

-- Enable RLS
ALTER TABLE public.sublabel_invitations ENABLE ROW LEVEL SECURITY;

-- Inviter can view their own invitations
CREATE POLICY "Users can view invitations they sent"
ON public.sublabel_invitations
FOR SELECT
USING (auth.uid() = inviter_id);

-- Invitee can view invitations sent to their email
CREATE POLICY "Users can view invitations sent to them"
ON public.sublabel_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND email = sublabel_invitations.invitee_email
  )
);

-- Only Signature/Prestige users can create invitations
CREATE POLICY "Signature/Prestige users can create invitations"
ON public.sublabel_invitations
FOR INSERT
WITH CHECK (
  auth.uid() = inviter_id AND
  EXISTS (
    SELECT 1 FROM public.user_plans up
    JOIN public.plans p ON up.plan_id = p.id
    WHERE up.user_id = auth.uid() 
    AND up.status = 'active'
    AND (p.name = 'Trackball Signature' OR p.name = 'Trackball Prestige')
  )
);

-- Users can update invitations they sent or received
CREATE POLICY "Users can update their invitations"
ON public.sublabel_invitations
FOR UPDATE
USING (
  auth.uid() = inviter_id OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND email = sublabel_invitations.invitee_email
  )
);

-- Admins can manage all invitations
CREATE POLICY "Admins can manage invitations"
ON public.sublabel_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_sublabel_invitations_inviter ON public.sublabel_invitations(inviter_id);
CREATE INDEX idx_sublabel_invitations_email ON public.sublabel_invitations(invitee_email);
CREATE INDEX idx_sublabel_invitations_status ON public.sublabel_invitations(status);