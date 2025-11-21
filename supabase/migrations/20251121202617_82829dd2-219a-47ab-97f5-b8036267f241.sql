-- Create collaborators table
CREATE TABLE public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Create release_collaborators junction table with percentage
CREATE TABLE public.release_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  percentage NUMERIC NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(release_id, collaborator_id)
);

-- Create payout_requests table
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborators
CREATE POLICY "Users can manage their own collaborators"
ON public.collaborators
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all collaborators"
ON public.collaborators
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for release_collaborators
CREATE POLICY "Users can manage collaborators for their releases"
ON public.release_collaborators
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.releases
  WHERE releases.id = release_collaborators.release_id
  AND releases.user_id = auth.uid()
));

CREATE POLICY "Admins can view all release collaborators"
ON public.release_collaborators
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for payout_requests
CREATE POLICY "Users can create their own payout requests"
ON public.payout_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own payout requests"
ON public.payout_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payout requests"
ON public.payout_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for payout_requests updated_at
CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();