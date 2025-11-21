-- Create subdistributors table for white label branding
CREATE TABLE public.subdistributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#dc2626',
  background_color text NOT NULL DEFAULT '#000000',
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  is_active boolean DEFAULT true
);

-- Add subdistributor_id to profiles
ALTER TABLE public.profiles
ADD COLUMN subdistributor_id uuid REFERENCES public.subdistributors(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.subdistributors ENABLE ROW LEVEL SECURITY;

-- Admins can manage all subdistributors
CREATE POLICY "Admins can manage subdistributors"
  ON public.subdistributors
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Subdistributor owners can view their own subdistributor
CREATE POLICY "Owners can view their subdistributor"
  ON public.subdistributors
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can view their assigned subdistributor
CREATE POLICY "Users can view their subdistributor"
  ON public.subdistributors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.subdistributor_id = subdistributors.id
    )
  );

-- Create subdistributor_admin role type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typelem = 0) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
  
  -- Add subdistributor_admin to enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'subdistributor_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'subdistributor_admin';
  END IF;
END $$;