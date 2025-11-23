-- Create table to store generated smart links
CREATE TABLE IF NOT EXISTS public.smart_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spotify_url TEXT NOT NULL,
  smart_link_url TEXT NOT NULL,
  toneden_link_id TEXT,
  title TEXT,
  platforms JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smart_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own smart links"
  ON public.smart_links
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own smart links"
  ON public.smart_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smart links"
  ON public.smart_links
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smart links"
  ON public.smart_links
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_smart_links_user_id ON public.smart_links(user_id);
CREATE INDEX idx_smart_links_created_at ON public.smart_links(created_at DESC);