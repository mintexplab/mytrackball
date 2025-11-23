-- Fix support_tickets foreign key to reference profiles instead of auth.users
ALTER TABLE public.support_tickets
DROP CONSTRAINT support_tickets_user_id_fkey;

ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix ticket_messages foreign key to reference profiles instead of auth.users  
ALTER TABLE public.ticket_messages
DROP CONSTRAINT ticket_messages_user_id_fkey;

ALTER TABLE public.ticket_messages
ADD CONSTRAINT ticket_messages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;