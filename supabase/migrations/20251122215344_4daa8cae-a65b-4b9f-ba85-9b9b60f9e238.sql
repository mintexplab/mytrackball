-- Create user_label_memberships table to track which labels a user belongs to
CREATE TABLE IF NOT EXISTS public.user_label_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  label_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member', 'staff')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, label_id)
);

-- Add active_label_id to profiles to track which label context the user is currently in
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_label_id UUID REFERENCES public.labels(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.user_label_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view their own label memberships
CREATE POLICY "Users can view their own label memberships"
ON public.user_label_memberships
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all label memberships
CREATE POLICY "Admins can view all label memberships"
ON public.user_label_memberships
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can manage all label memberships
CREATE POLICY "Admins can manage label memberships"
ON public.user_label_memberships
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_user_label_memberships_user_id ON public.user_label_memberships(user_id);
CREATE INDEX idx_user_label_memberships_label_id ON public.user_label_memberships(label_id);
CREATE INDEX idx_profiles_active_label_id ON public.profiles(active_label_id);