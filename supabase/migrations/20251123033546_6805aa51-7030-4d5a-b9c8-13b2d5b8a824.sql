-- Fix ISRC counter security vulnerability
-- Remove the broad UPDATE policy that allows any authenticated user to modify the counter

DROP POLICY IF EXISTS "Authenticated users can update ISRC counter" ON public.isrc_counter;

-- Create a secure SECURITY DEFINER function that is the ONLY way to generate new ISRCs
-- This prevents race conditions and ensures sequential ISRC generation
CREATE OR REPLACE FUNCTION public.generate_next_isrc()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  isrc_code TEXT;
  current_prefix TEXT;
BEGIN
  -- Lock the row to prevent concurrent updates (critical for data integrity)
  SELECT last_number + 1, prefix 
  INTO next_number, current_prefix
  FROM isrc_counter
  WHERE id = (SELECT id FROM isrc_counter LIMIT 1)
  FOR UPDATE;
  
  -- Check if we've exceeded the 99999 limit
  IF next_number > 99999 THEN
    RAISE EXCEPTION 'ISRC counter has reached maximum value (99999). Please contact system administrator.';
  END IF;
  
  -- Update counter atomically
  UPDATE isrc_counter
  SET last_number = next_number,
      updated_at = NOW()
  WHERE id = (SELECT id FROM isrc_counter LIMIT 1);
  
  -- Format ISRC code with zero-padding (e.g., CBGNR2500001)
  isrc_code := CONCAT(current_prefix, LPAD(next_number::text, 5, '0'));
  
  -- Log for audit trail
  RAISE NOTICE 'Generated ISRC: %', isrc_code;
  
  RETURN isrc_code;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_next_isrc() TO authenticated;

-- Ensure SELECT policy exists for monitoring (read-only access)
DROP POLICY IF EXISTS "Authenticated users can view ISRC counter" ON public.isrc_counter;
CREATE POLICY "Authenticated users can view ISRC counter"
ON public.isrc_counter
FOR SELECT
USING (true);

-- Add comment explaining the security model
COMMENT ON FUNCTION public.generate_next_isrc() IS 
'Securely generates sequential ISRC codes. This is the ONLY way to obtain new ISRCs. Direct UPDATE on isrc_counter table is prohibited to prevent duplicate ISRCs and maintain data integrity.';
