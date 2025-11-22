-- Populate existing users with their label memberships based on current label_id
-- This is a one-time migration to transition existing users to the new multi-label system

INSERT INTO public.user_label_memberships (user_id, label_id, label_name, role)
SELECT 
  p.id,
  p.label_id,
  p.label_name,
  CASE 
    WHEN l.user_id = p.id THEN 'owner'::text
    ELSE 'member'::text
  END as role
FROM public.profiles p
INNER JOIN public.labels l ON p.label_id = l.id
WHERE p.label_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_label_memberships ulm 
    WHERE ulm.user_id = p.id AND ulm.label_id = p.label_id
  );

-- Set active_label_id to match current label_id for users who don't have one set
UPDATE public.profiles
SET active_label_id = label_id
WHERE label_id IS NOT NULL
  AND active_label_id IS NULL;