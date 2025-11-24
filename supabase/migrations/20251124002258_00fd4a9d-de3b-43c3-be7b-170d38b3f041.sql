-- Update handle_new_user function to automatically assign Trackball Free plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  free_plan_id uuid;
BEGIN
  -- Create profile
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
  
  -- Get Trackball Free plan ID
  SELECT id INTO free_plan_id
  FROM public.plans
  WHERE name = 'Trackball Free'
  LIMIT 1;
  
  -- Assign Trackball Free plan if it exists
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_plans (user_id, plan_id, plan_name, status)
    VALUES (new.id, free_plan_id, 'Trackball Free', 'active');
  END IF;
  
  RETURN new;
END;
$function$;