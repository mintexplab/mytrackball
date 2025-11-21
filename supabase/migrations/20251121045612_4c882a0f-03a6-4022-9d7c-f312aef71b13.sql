-- Create notifications table for user notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- 'info', 'plan_upgrade', 'system'
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark their notifications as read
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can create notifications for users
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create royalties table
CREATE TABLE public.royalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  period text NOT NULL, -- e.g., "2025-01", "Q1 2025"
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.royalties ENABLE ROW LEVEL SECURITY;

-- Users can view their own royalties
CREATE POLICY "Users can view their own royalties"
ON public.royalties
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all royalties
CREATE POLICY "Admins can manage royalties"
ON public.royalties
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add takedown_requested field to releases
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS takedown_requested boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_royalties_user_id ON public.royalties(user_id);