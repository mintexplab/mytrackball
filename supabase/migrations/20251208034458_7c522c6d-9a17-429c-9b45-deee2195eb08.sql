-- Allow users to update their own fines (to mark as paid/cancelled)
CREATE POLICY "Users can update their own fines"
ON public.user_fines
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);