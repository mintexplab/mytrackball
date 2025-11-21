-- Add new columns to profiles for user display, labels, and account relationships
ALTER TABLE public.profiles
ADD COLUMN display_name text,
ADD COLUMN label_name text,
ADD COLUMN user_id text UNIQUE,
ADD COLUMN parent_account_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Generate 5-digit user IDs for existing users
DO $$
DECLARE
  user_record RECORD;
  new_user_id text;
  max_attempts integer := 100;
  attempt integer;
BEGIN
  FOR user_record IN SELECT id FROM public.profiles WHERE user_id IS NULL LOOP
    attempt := 0;
    LOOP
      -- Generate random 5-digit number
      new_user_id := LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');
      
      -- Check if it exists
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = new_user_id) THEN
        UPDATE public.profiles SET user_id = new_user_id WHERE id = user_record.id;
        EXIT;
      END IF;
      
      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Could not generate unique user_id after % attempts', max_attempts;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Make user_id not nullable after populating
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;

-- Create function to generate user_id for new users
CREATE OR REPLACE FUNCTION public.generate_user_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id text;
  max_attempts integer := 100;
  attempt integer := 0;
BEGIN
  LOOP
    new_id := LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = new_id) THEN
      RETURN new_id;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique user_id after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Update the handle_new_user function to include user_id generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_id, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    public.generate_user_id(),
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$function$;

-- Add RLS policy for viewing sublabel accounts
CREATE POLICY "Users can view their sublabel accounts"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = parent_account_id
);

-- Add RLS policy for sublabel accounts to view their parent
CREATE POLICY "Sublabel accounts can view their parent"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR 
  parent_account_id = auth.uid() OR
  id = (SELECT parent_account_id FROM public.profiles WHERE id = auth.uid())
);

COMMENT ON COLUMN public.profiles.display_name IS 'User-configurable display name shown in top bar';
COMMENT ON COLUMN public.profiles.label_name IS 'Label name, configurable by Signature/Prestige users';
COMMENT ON COLUMN public.profiles.user_id IS 'Unique 5-digit identifier for each user';
COMMENT ON COLUMN public.profiles.parent_account_id IS 'Reference to parent account for sublabel accounts';