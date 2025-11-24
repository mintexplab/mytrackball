-- Fix search_path security issue
DROP FUNCTION IF EXISTS public.update_label_banner_updated_at CASCADE;

CREATE OR REPLACE FUNCTION public.update_label_banner_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_label_dropdown_banners_updated_at
BEFORE UPDATE ON public.label_dropdown_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_label_banner_updated_at();