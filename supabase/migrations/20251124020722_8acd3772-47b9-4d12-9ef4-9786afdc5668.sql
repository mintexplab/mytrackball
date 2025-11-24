-- Add dropdown banner customization for subdistributors
ALTER TABLE public.profiles
ADD COLUMN subdistributor_banner_url TEXT;