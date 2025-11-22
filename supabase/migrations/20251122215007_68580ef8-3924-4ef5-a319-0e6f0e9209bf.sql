-- Create audit log table for tracking partner account changes
CREATE TABLE IF NOT EXISTS public.partner_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('royalty_split_change', 'service_access_change')),
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.partner_audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.partner_audit_log
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.partner_audit_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_partner_audit_log_user_id ON public.partner_audit_log(user_id);
CREATE INDEX idx_partner_audit_log_created_at ON public.partner_audit_log(created_at DESC);