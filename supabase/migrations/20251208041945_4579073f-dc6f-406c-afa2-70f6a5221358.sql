-- Add admin policy to view all track allowance usage
CREATE POLICY "Admins can view all track usage"
ON public.track_allowance_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policy to manage all track allowance usage
CREATE POLICY "Admins can manage all track usage"
ON public.track_allowance_usage
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));