-- =====================================================
-- Fix_Messaging_Relations.sql
-- Force foreign keys to point to public.users for joins
-- =====================================================

-- 1. Fix messages table
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey 
  FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_agency_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_agency_id_fkey 
  FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

-- 2. Fix announcement_interests
ALTER TABLE public.announcement_interests DROP CONSTRAINT IF EXISTS announcement_interests_user_id_fkey;
ALTER TABLE public.announcement_interests ADD CONSTRAINT announcement_interests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Fix collaboration_requests
-- Add requester_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='collaboration_requests' AND column_name='requester_id') THEN
        ALTER TABLE public.collaboration_requests ADD COLUMN requester_id UUID;
    END IF;
END $$;

ALTER TABLE public.collaboration_requests DROP CONSTRAINT IF EXISTS collaboration_requests_requester_id_fkey;
ALTER TABLE public.collaboration_requests ADD CONSTRAINT collaboration_requests_requester_id_fkey 
  FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.collaboration_requests DROP CONSTRAINT IF EXISTS collaboration_requests_requester_agency_id_fkey;
ALTER TABLE public.collaboration_requests ADD CONSTRAINT collaboration_requests_requester_agency_id_fkey 
  FOREIGN KEY (requester_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

ALTER TABLE public.collaboration_requests DROP CONSTRAINT IF EXISTS collaboration_requests_target_agency_id_fkey;
ALTER TABLE public.collaboration_requests ADD CONSTRAINT collaboration_requests_target_agency_id_fkey 
  FOREIGN KEY (target_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

-- 4. Fix announcements for good measure
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_agency_id_fkey;
ALTER TABLE public.announcements ADD CONSTRAINT announcements_agency_id_fkey 
  FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


-- Notification de succès
SELECT 'Relations de messagerie et colonnes manquantes mises à jour ✅' AS status;
