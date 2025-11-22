-- Create Partner plan for custom label deals
INSERT INTO plans (name, price, description, features, max_releases)
VALUES (
  'Trackball Partner',
  0,
  'Custom partner agreement with Trackball Distribution',
  '["You have a custom partner deal with Trackball Distribution, please ask your label manager about deal offerings"]'::jsonb,
  NULL
)
ON CONFLICT (name) DO NOTHING;

-- Create label_invitations table for tracking label onboarding
CREATE TABLE IF NOT EXISTS label_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  label_name TEXT NOT NULL,
  master_account_email TEXT NOT NULL,
  additional_users TEXT[] DEFAULT ARRAY[]::TEXT[],
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('Trackball Signature', 'Trackball Prestige', 'Trackball Partner')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE label_invitations ENABLE ROW LEVEL SECURITY;

-- Admin can manage all label invitations
CREATE POLICY "Admins can manage label invitations"
ON label_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their label invitations"
ON label_invitations
FOR SELECT
USING (
  master_account_email = (SELECT email FROM profiles WHERE id = auth.uid())
  OR auth.uid()::text = ANY(additional_users)
);