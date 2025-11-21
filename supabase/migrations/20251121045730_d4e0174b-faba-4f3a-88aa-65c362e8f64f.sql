-- Update royalties table to reference profiles instead of auth.users
ALTER TABLE public.royalties DROP CONSTRAINT IF EXISTS royalties_user_id_fkey;
ALTER TABLE public.royalties DROP CONSTRAINT IF EXISTS royalties_created_by_fkey;

ALTER TABLE public.royalties 
ADD CONSTRAINT royalties_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.royalties 
ADD CONSTRAINT royalties_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);