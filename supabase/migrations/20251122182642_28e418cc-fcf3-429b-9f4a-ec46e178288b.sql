-- Create distribution_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.distribution_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for their own releases
CREATE POLICY "Users can view their release logs"
ON public.distribution_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.releases
    WHERE releases.id = distribution_logs.release_id
    AND releases.user_id = auth.uid()
  )
);

-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
ON public.distribution_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert logs
CREATE POLICY "Admins can insert logs"
ON public.distribution_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_distribution_logs_release_id ON public.distribution_logs(release_id);
CREATE INDEX idx_distribution_logs_created_at ON public.distribution_logs(created_at DESC);

-- Create function to automatically log status changes
CREATE OR REPLACE FUNCTION log_release_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.distribution_logs (release_id, status, notes, changed_by)
    VALUES (NEW.id, NEW.status, NEW.notes, auth.uid());
  END IF;
  
  -- Log initial submission
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.distribution_logs (release_id, status, notes, changed_by)
    VALUES (NEW.id, COALESCE(NEW.status, 'pending'), 'Release submitted', NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-log status changes
DROP TRIGGER IF EXISTS release_status_change_trigger ON public.releases;
CREATE TRIGGER release_status_change_trigger
AFTER INSERT OR UPDATE ON public.releases
FOR EACH ROW
EXECUTE FUNCTION log_release_status_change();