-- =============================================================================
-- GESTION360 - Script de correction RPC + securisation RLS
-- Executer dans : Supabase → SQL Editor
-- =============================================================================

-- =============================================================================
-- PARTIE 1 : RPC approve_agency_request (CORRIGEE - gere FK processed_by)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.approve_agency_request(p_request_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id      UUID;
    v_admin_role   TEXT;
    v_req          RECORD;
    v_agency_id    UUID;
    v_existing_id  UUID;
    v_processed_by UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Non authentifie');
    END IF;

    SELECT role INTO v_admin_role FROM public.platform_admins
    WHERE user_id = v_user_id AND is_active = true;

    IF v_admin_role IS NULL OR v_admin_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object(
            'error', 'Permissions insuffisantes',
            'detail', 'Role: ' || COALESCE(v_admin_role, 'aucun'),
            'user_id', v_user_id::TEXT
        );
    END IF;

    SELECT * INTO v_req FROM public.agency_registration_requests WHERE id = p_request_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Demande introuvable'); END IF;
    IF v_req.status = 'approved' THEN RETURN jsonb_build_object('error', 'Deja approuvee'); END IF;

    SELECT id INTO v_existing_id FROM public.agencies WHERE commercial_register = v_req.commercial_register;
    IF FOUND THEN
        RETURN jsonb_build_object('error', 'RCCM deja utilise: ' || v_existing_id::TEXT);
    END IF;

    BEGIN
        INSERT INTO public.agencies (
            name, commercial_register, logo_url, is_accredited, accreditation_number,
            address, city, phone, email, status, director_id
        ) VALUES (
            v_req.agency_name, v_req.commercial_register, v_req.logo_url,
            COALESCE(v_req.is_accredited, false), v_req.accreditation_number,
            COALESCE(NULLIF(TRIM(v_req.address), ''), 'A completer'),
            COALESCE(NULLIF(TRIM(v_req.city), ''), 'A completer'),
            COALESCE(NULLIF(TRIM(v_req.phone), ''), '0000000000'),
            COALESCE(NULLIF(TRIM(v_req.director_email), ''), 'contact@agence.ci'),
            'approved', v_req.director_auth_user_id
        ) RETURNING id INTO v_agency_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', 'Echec agencies insert: ' || SQLERRM, 'detail', SQLSTATE);
    END;

    IF v_req.director_auth_user_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.agency_users (user_id, agency_id, role)
            VALUES (v_req.director_auth_user_id, v_agency_id, 'director')
            ON CONFLICT (user_id, agency_id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN RAISE WARNING 'agency_users: %', SQLERRM; END;
    END IF;

    BEGIN
        INSERT INTO public.agency_subscriptions (
            agency_id, plan_type, status, monthly_fee,
            start_date, next_payment_date, trial_days_remaining
        ) VALUES (v_agency_id, 'basic', 'trial', 25000, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 30);
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'agency_subscriptions: %', SQLERRM; END;

    -- processed_by : NULL si l admin n a pas de ligne dans public.users (evite FK error)
    SELECT CASE WHEN EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id)
                THEN v_user_id ELSE NULL END INTO v_processed_by;

    UPDATE public.agency_registration_requests
    SET status = 'approved', processed_by = v_processed_by, processed_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'agency_id', v_agency_id::TEXT);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_agency_request(UUID) TO authenticated;

-- =============================================================================
-- PARTIE 2 : Fonctions helpers RLS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin','super_admin'));
$$;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_agency_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.my_agency_id() TO authenticated;

-- =============================================================================
-- PARTIE 3 : RLS sur toutes les tables
-- =============================================================================

-- platform_admins
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_select_own" ON public.platform_admins;
CREATE POLICY "admin_select_own" ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "super_admin_all" ON public.platform_admins;
CREATE POLICY "super_admin_all" ON public.platform_admins FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- agency_registration_requests
ALTER TABLE public.agency_registration_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_requests" ON public.agency_registration_requests;
CREATE POLICY "admin_read_requests" ON public.agency_registration_requests FOR SELECT TO authenticated USING (public.is_platform_admin());
DROP POLICY IF EXISTS "anon_insert_request" ON public.agency_registration_requests;
CREATE POLICY "anon_insert_request" ON public.agency_registration_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_update_request" ON public.agency_registration_requests;
CREATE POLICY "admin_update_request" ON public.agency_registration_requests FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- agencies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_agencies" ON public.agencies;
CREATE POLICY "admin_all_agencies" ON public.agencies FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
DROP POLICY IF EXISTS "agency_user_read_own" ON public.agencies;
CREATE POLICY "agency_user_read_own" ON public.agencies FOR SELECT TO authenticated USING (id = public.my_agency_id());

-- agency_users
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_agency_users" ON public.agency_users;
CREATE POLICY "admin_all_agency_users" ON public.agency_users FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
DROP POLICY IF EXISTS "agency_read_own_users" ON public.agency_users;
CREATE POLICY "agency_read_own_users" ON public.agency_users FOR SELECT TO authenticated USING (agency_id = public.my_agency_id());
DROP POLICY IF EXISTS "user_read_own_record" ON public.agency_users;
CREATE POLICY "user_read_own_record" ON public.agency_users FOR SELECT TO authenticated USING (user_id = auth.uid());

-- agency_subscriptions
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_subscriptions" ON public.agency_subscriptions;
CREATE POLICY "admin_all_subscriptions" ON public.agency_subscriptions FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
DROP POLICY IF EXISTS "agency_read_own_subscription" ON public.agency_subscriptions;
CREATE POLICY "agency_read_own_subscription" ON public.agency_subscriptions FOR SELECT TO authenticated USING (agency_id = public.my_agency_id());

-- subscription_payments
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_sub_payments" ON public.subscription_payments;
CREATE POLICY "admin_all_sub_payments" ON public.subscription_payments FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- agency_rankings
ALTER TABLE public.agency_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_rankings" ON public.agency_rankings;
CREATE POLICY "admin_all_rankings" ON public.agency_rankings FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
DROP POLICY IF EXISTS "agency_read_own_ranking" ON public.agency_rankings;
CREATE POLICY "agency_read_own_ranking" ON public.agency_rankings FOR SELECT TO authenticated USING (agency_id = public.my_agency_id());

-- platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_settings_read" ON public.platform_settings;
CREATE POLICY "public_settings_read" ON public.platform_settings FOR SELECT TO authenticated USING (is_public = true OR public.is_platform_admin());
DROP POLICY IF EXISTS "admin_all_settings" ON public.platform_settings;
CREATE POLICY "admin_all_settings" ON public.platform_settings FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- owners
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency_crud_owners" ON public.owners;
CREATE POLICY "agency_crud_owners" ON public.owners FOR ALL TO authenticated USING (agency_id = public.my_agency_id()) WITH CHECK (agency_id = public.my_agency_id());
DROP POLICY IF EXISTS "admin_read_owners" ON public.owners;
CREATE POLICY "admin_read_owners" ON public.owners FOR SELECT TO authenticated USING (public.is_platform_admin());

-- tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency_crud_tenants" ON public.tenants;
CREATE POLICY "agency_crud_tenants" ON public.tenants FOR ALL TO authenticated USING (agency_id = public.my_agency_id()) WITH CHECK (agency_id = public.my_agency_id());
DROP POLICY IF EXISTS "admin_read_tenants" ON public.tenants;
CREATE POLICY "admin_read_tenants" ON public.tenants FOR SELECT TO authenticated USING (public.is_platform_admin());

-- properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency_crud_properties" ON public.properties;
CREATE POLICY "agency_crud_properties" ON public.properties FOR ALL TO authenticated USING (agency_id = public.my_agency_id()) WITH CHECK (agency_id = public.my_agency_id());
DROP POLICY IF EXISTS "public_read_properties" ON public.properties;
CREATE POLICY "public_read_properties" ON public.properties FOR SELECT TO anon, authenticated USING (is_available = true);

-- contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency_crud_contracts" ON public.contracts;
CREATE POLICY "agency_crud_contracts" ON public.contracts FOR ALL TO authenticated USING (agency_id = public.my_agency_id()) WITH CHECK (agency_id = public.my_agency_id());

-- rent_receipts
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency_crud_receipts" ON public.rent_receipts;
CREATE POLICY "agency_crud_receipts" ON public.rent_receipts FOR ALL TO authenticated
USING (contract_id IN (SELECT id FROM public.contracts WHERE agency_id = public.my_agency_id()))
WITH CHECK (contract_id IN (SELECT id FROM public.contracts WHERE agency_id = public.my_agency_id()));

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_notifications" ON public.notifications;
CREATE POLICY "user_own_notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_notif_settings" ON public.notification_settings;
CREATE POLICY "user_own_notif_settings" ON public.notification_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_messages" ON public.messages;
CREATE POLICY "user_own_messages" ON public.messages FOR ALL TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

-- announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_announcements" ON public.announcements;
CREATE POLICY "public_read_announcements" ON public.announcements FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "agency_crud_announcements" ON public.announcements;
CREATE POLICY "agency_crud_announcements" ON public.announcements FOR ALL TO authenticated USING (agency_id = public.my_agency_id()) WITH CHECK (agency_id = public.my_agency_id());

-- financial_statements
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency_crud_financial" ON public.financial_statements;
CREATE POLICY "agency_crud_financial" ON public.financial_statements FOR ALL TO authenticated USING (agency_id = public.my_agency_id()) WITH CHECK (agency_id = public.my_agency_id());
DROP POLICY IF EXISTS "admin_read_financial" ON public.financial_statements;
CREATE POLICY "admin_read_financial" ON public.financial_statements FOR SELECT TO authenticated USING (public.is_platform_admin());

-- audit_logs (si existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "admin_read_audit" ON public.audit_logs';
    EXECUTE 'CREATE POLICY "admin_read_audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_platform_admin())';
    EXECUTE 'DROP POLICY IF EXISTS "system_insert_audit" ON public.audit_logs';
    EXECUTE 'CREATE POLICY "system_insert_audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END $$;

-- Verification finale
SELECT 'platform_admins' AS table, id::TEXT, user_id::TEXT, role, is_active FROM public.platform_admins;
