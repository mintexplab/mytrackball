-- Add rejection_reason to releases table
ALTER TABLE public.releases ADD COLUMN rejection_reason TEXT;

-- Add composer, writer, contributor, publisher and publisher_ipi to tracks table
ALTER TABLE public.tracks ADD COLUMN composer TEXT;
ALTER TABLE public.tracks ADD COLUMN writer TEXT;
ALTER TABLE public.tracks ADD COLUMN contributor TEXT;
ALTER TABLE public.tracks ADD COLUMN publisher TEXT;
ALTER TABLE public.tracks ADD COLUMN publisher_ipi TEXT;