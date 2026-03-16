-- =====================================================
-- Fix_Collaboration_Hub.sql
-- Création des tables de collaboration et policies RLS
-- À exécuter dans l'éditeur SQL de Supabase
-- =====================================================

-- -------------------------------------------------------
-- 1. TABLE: announcements
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id             UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id           UUID REFERENCES public.properties(id) ON DELETE SET NULL,  -- optionnel si bien non enregistré
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('location', 'vente')),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at            TIMESTAMPTZ,
  views                 INTEGER NOT NULL DEFAULT 0,
  mandate_url           TEXT,            -- URL Supabase Storage du mandat uploadé
  mandate_type          TEXT CHECK (mandate_type IN ('vente', 'gestion')),
  external_property_ref TEXT,            -- Référence du bien externe (si non enregistré)
  photos                JSONB DEFAULT '[]', -- URLs publiques des photos (max 5)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. TABLE: announcement_interests
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcement_interests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id  UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  agency_id        UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 3. TABLE: collaboration_requests
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  target_agency_id    UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  tier_type           TEXT NOT NULL CHECK (tier_type IN ('tenant', 'owner')),
  tier_id             UUID NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 4. TABLE: messages
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agency_id        UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id      UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  announcement_id  UUID REFERENCES public.announcements(id) ON DELETE SET NULL,
  subject          TEXT,
  content          TEXT NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  attachments      JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 5. RLS: announcements
-- -------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_announcements" ON public.announcements;
CREATE POLICY "public_read_announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "agency_insert_announcements" ON public.announcements;
CREATE POLICY "agency_insert_announcements"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.my_agency_id());

DROP POLICY IF EXISTS "agency_update_announcements" ON public.announcements;
CREATE POLICY "agency_update_announcements"
  ON public.announcements FOR UPDATE TO authenticated
  USING (agency_id = public.my_agency_id())
  WITH CHECK (agency_id = public.my_agency_id());

DROP POLICY IF EXISTS "agency_delete_announcements" ON public.announcements;
CREATE POLICY "agency_delete_announcements"
  ON public.announcements FOR DELETE TO authenticated
  USING (agency_id = public.my_agency_id());

-- -------------------------------------------------------
-- 6. RLS: announcement_interests
-- -------------------------------------------------------
ALTER TABLE public.announcement_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_read_announcement_interests" ON public.announcement_interests;
CREATE POLICY "agency_read_announcement_interests"
  ON public.announcement_interests FOR SELECT TO authenticated
  USING (agency_id = public.my_agency_id() OR
         announcement_id IN (SELECT id FROM public.announcements WHERE agency_id = public.my_agency_id()));

DROP POLICY IF EXISTS "agency_insert_announcement_interests" ON public.announcement_interests;
CREATE POLICY "agency_insert_announcement_interests"
  ON public.announcement_interests FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.my_agency_id());

DROP POLICY IF EXISTS "agency_update_announcement_interests" ON public.announcement_interests;
CREATE POLICY "agency_update_announcement_interests"
  ON public.announcement_interests FOR UPDATE TO authenticated
  USING (announcement_id IN (SELECT id FROM public.announcements WHERE agency_id = public.my_agency_id()));

-- -------------------------------------------------------
-- 7. RLS: collaboration_requests
-- -------------------------------------------------------
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_collaboration_requests" ON public.collaboration_requests;
CREATE POLICY "agency_collaboration_requests"
  ON public.collaboration_requests FOR ALL TO authenticated
  USING (
    requester_agency_id = public.my_agency_id() OR
    target_agency_id    = public.my_agency_id()
  )
  WITH CHECK (
    requester_agency_id = public.my_agency_id()
  );

-- -------------------------------------------------------
-- 8. RLS: messages
-- -------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_messages" ON public.messages;
CREATE POLICY "agency_messages"
  ON public.messages FOR ALL TO authenticated
  USING (
    agency_id   = public.my_agency_id() OR
    sender_id   = auth.uid() OR
    receiver_id = auth.uid()
  )
  WITH CHECK (
    agency_id = public.my_agency_id()
  );

-- -------------------------------------------------------
-- 9. Trigger: auto-update updated_at
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_announcements_updated_at'
  ) THEN
    CREATE TRIGGER set_announcements_updated_at
      BEFORE UPDATE ON public.announcements
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_messages_updated_at'
  ) THEN
    CREATE TRIGGER set_messages_updated_at
      BEFORE UPDATE ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_collaboration_requests_updated_at'
  ) THEN
    CREATE TRIGGER set_collaboration_requests_updated_at
      BEFORE UPDATE ON public.collaboration_requests
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END;
$$;

-- -------------------------------------------------------
-- Done!
-- -------------------------------------------------------
SELECT 'Fix_Collaboration_Hub.sql applied successfully ✅' AS status;
