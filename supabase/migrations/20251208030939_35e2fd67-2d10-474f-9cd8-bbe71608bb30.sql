-- Add preferred currency to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'CAD';

-- Add strike count and suspension tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strike_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Create user_fines table
CREATE TABLE public.user_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  reason text NOT NULL,
  fine_type text NOT NULL CHECK (fine_type IN ('copyright_strike', 'platform_misuse', 'tos_violation', 'other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  strike_number integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  paid_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  issued_by uuid REFERENCES public.profiles(id),
  notes text
);

-- Enable RLS
ALTER TABLE public.user_fines ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_fines
CREATE POLICY "Users can view their own fines"
ON public.user_fines
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all fines"
ON public.user_fines
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check and handle 3-strike suspension
CREATE OR REPLACE FUNCTION public.handle_fine_suspension()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update strike count on profile
  UPDATE public.profiles
  SET strike_count = (
    SELECT COUNT(*) FROM public.user_fines 
    WHERE user_id = NEW.user_id AND status IN ('pending', 'paid')
  )
  WHERE id = NEW.user_id;
  
  -- Check if user has reached 3 strikes
  IF (SELECT strike_count FROM public.profiles WHERE id = NEW.user_id) >= 3 THEN
    -- Suspend the account
    UPDATE public.profiles
    SET 
      suspended_at = now(),
      suspension_reason = 'Account suspended due to 3 strikes. A $55 CAD penalty fee applies.'
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for fine insertion
CREATE TRIGGER on_fine_created
  AFTER INSERT ON public.user_fines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_fine_suspension();