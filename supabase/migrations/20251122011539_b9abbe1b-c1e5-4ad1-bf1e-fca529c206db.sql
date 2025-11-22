-- Create publishing submissions table
CREATE TABLE IF NOT EXISTS public.publishing_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_title TEXT NOT NULL,
  song_type TEXT NOT NULL,
  isrcs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  alternate_titles TEXT[] DEFAULT ARRAY[]::TEXT[],
  performers TEXT[] DEFAULT ARRAY[]::TEXT[],
  genre TEXT,
  has_third_party_content BOOLEAN DEFAULT false,
  has_public_domain_content BOOLEAN DEFAULT false,
  shareholders JSONB NOT NULL DEFAULT '[]'::JSONB,
  publishers JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.publishing_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view their own publishing submissions"
ON public.publishing_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own submissions
CREATE POLICY "Users can create their own publishing submissions"
ON public.publishing_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all publishing submissions"
ON public.publishing_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all submissions
CREATE POLICY "Admins can manage all publishing submissions"
ON public.publishing_submissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_publishing_submissions_updated_at
BEFORE UPDATE ON public.publishing_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();