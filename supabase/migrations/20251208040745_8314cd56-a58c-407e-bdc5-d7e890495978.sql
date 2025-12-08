-- Create track_allowance_usage table to track monthly track usage
CREATE TABLE public.track_allowance_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_count INTEGER NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  subscription_id TEXT,
  tracks_allowed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.track_allowance_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own track usage" 
ON public.track_allowance_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own track usage" 
ON public.track_allowance_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own track usage" 
ON public.track_allowance_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_track_allowance_user_month ON public.track_allowance_usage(user_id, month_year);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_track_allowance_usage_updated_at
BEFORE UPDATE ON public.track_allowance_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();