-- Add RLS policy to allow users to delete their own releases
CREATE POLICY "Users can delete their own releases"
ON public.releases
FOR DELETE
USING (auth.uid() = user_id);