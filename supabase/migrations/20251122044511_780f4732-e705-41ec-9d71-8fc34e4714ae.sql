-- Create account_appeals table
CREATE TABLE IF NOT EXISTS public.account_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  appeal_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_appeals ENABLE ROW LEVEL SECURITY;

-- Users can create their own appeals
CREATE POLICY "Users can create their own appeals"
  ON public.account_appeals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own appeals
CREATE POLICY "Users can view their own appeals"
  ON public.account_appeals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all appeals
CREATE POLICY "Admins can manage all appeals"
  ON public.account_appeals
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_account_appeals_updated_at
  BEFORE UPDATE ON public.account_appeals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();