-- Fix search path for security function
CREATE OR REPLACE FUNCTION validate_collaborator_percentages()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_percentage NUMERIC;
BEGIN
  -- Calculate total percentage for this release
  SELECT COALESCE(SUM(percentage), 0)
  INTO total_percentage
  FROM release_collaborators
  WHERE release_id = NEW.release_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Add the new/updated percentage
  total_percentage := total_percentage + NEW.percentage;
  
  -- Validate
  IF total_percentage > 100 THEN
    RAISE EXCEPTION 'Total royalty percentage cannot exceed 100 percent. Current total would be: %', total_percentage;
  END IF;
  
  IF NEW.percentage <= 0 OR NEW.percentage > 100 THEN
    RAISE EXCEPTION 'Individual percentage must be between 0 and 100';
  END IF;
  
  RETURN NEW;
END;
$$;