-- Add label_id column to labels table
ALTER TABLE public.labels ADD COLUMN label_id text;

-- Create function to generate unique 5-digit label IDs
CREATE OR REPLACE FUNCTION public.generate_label_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id text;
  max_attempts integer := 100;
  attempt integer := 0;
BEGIN
  LOOP
    new_id := LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');
    
    IF NOT EXISTS (SELECT 1 FROM public.labels WHERE label_id = new_id) THEN
      RETURN new_id;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique label_id after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Generate label_ids for existing labels
UPDATE public.labels SET label_id = public.generate_label_id() WHERE label_id IS NULL;

-- Make label_id NOT NULL after populating existing records
ALTER TABLE public.labels ALTER COLUMN label_id SET NOT NULL;

-- Create trigger to auto-generate label_id for new labels
CREATE OR REPLACE FUNCTION public.handle_new_label()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.label_id IS NULL THEN
    NEW.label_id := public.generate_label_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_label_created
  BEFORE INSERT ON public.labels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_label();