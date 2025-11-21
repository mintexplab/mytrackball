-- Create labels table
CREATE TABLE public.labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for labels
CREATE POLICY "Admins can view all labels"
ON public.labels
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own labels"
ON public.labels
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own labels"
ON public.labels
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labels"
ON public.labels
FOR UPDATE
USING (auth.uid() = user_id);

-- Add label_id to profiles
ALTER TABLE public.profiles ADD COLUMN label_id UUID REFERENCES public.labels(id);

-- Migrate existing label_name data to labels table
INSERT INTO public.labels (name, user_id)
SELECT DISTINCT label_name, id
FROM public.profiles
WHERE label_name IS NOT NULL AND label_name != '';

-- Update profiles with the new label_id
UPDATE public.profiles p
SET label_id = l.id
FROM public.labels l
WHERE p.label_name = l.name AND p.id = l.user_id;

-- Create artist invitations table
CREATE TABLE public.artist_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE public.artist_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all artist invitations"
ON public.artist_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view invitations sent to their email"
ON public.artist_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = artist_invitations.email
  )
);