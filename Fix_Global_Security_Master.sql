-- =============================================================================
-- GESTION360 - SCRIPT DE SÉCURITÉ MAÎTRE (V23)
-- Ce script centralise la sécurisation complète de la base de données.
-- Il active le RLS sur TOUTES les tables et définit des politiques robustes.
-- À EXÉCUTER DANS : Supabase → SQL Editor
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1 : FONCTIONS HELPERS (SECURITY DEFINER - INDISPENSABLES POUR RLS)
-- =============================================================================

-- 1.1. Vérifier si l'utilisateur est un admin plateforme
CREATE OR REPLACE FUNCTION public.is_platform_admin() 
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- 1.2. Récupérer la liste des IDs d'agences de l'utilisateur
CREATE OR REPLACE FUNCTION public.get_my_agency_ids()
RETURNS TABLE (agency_id UUID) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid();
$$;

-- 1.3. Vérifier l'appartenance à une agence spécifique
CREATE OR REPLACE FUNCTION public.is_agency_member(p_agency_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
$$;

-- 1.4. Vérifier si un utilisateur est Directeur de son agence
CREATE OR REPLACE FUNCTION public.is_agency_director(p_agency_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id 
    AND role = 'director'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_agency_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_director(UUID) TO authenticated;

-- =============================================================================
-- ÉTAPE 2 : ACTIVATION GLOBALE DU RLS SUR TOUTES LES TABLES
-- =============================================================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- =============================================================================
-- ÉTAPE 3 : POLITIQUES DE SÉCURITÉ PAR DOMAINE
-- =============================================================================

-- --- 3.1. UTILISATEURS & PROFILS ---

-- users : On peut voir son profil, et les membres d'une même agence peuvent se voir entre eux.
DROP POLICY IF EXISTS "users_read_policy" ON public.users;
CREATE POLICY "users_read_policy" ON public.users FOR SELECT TO authenticated 
USING (
    id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.agency_users au1
        JOIN public.agency_users au2 ON au1.agency_id = au2.agency_id
        WHERE au1.user_id = auth.uid() AND au2.user_id = public.users.id
    )
);

DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self" ON public.users FOR UPDATE TO authenticated 
USING (id = auth.uid()) WITH CHECK (id = auth.uid());


-- --- 3.2. AGENCES & STRUCTURES ---

-- agencies
DROP POLICY IF EXISTS "agencies_visible_to_members" ON public.agencies;
CREATE POLICY "agencies_visible_to_members" ON public.agencies FOR SELECT TO authenticated 
USING (public.is_agency_member(id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "admin_manage_agencies" ON public.agencies;
CREATE POLICY "admin_manage_agencies" ON public.agencies FOR ALL TO authenticated 
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- agency_users
DROP POLICY IF EXISTS "agency_users_read" ON public.agency_users;
CREATE POLICY "agency_users_read" ON public.agency_users FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR public.is_agency_member(agency_id));

DROP POLICY IF EXISTS "director_manage_members" ON public.agency_users;
CREATE POLICY "director_manage_members" ON public.agency_users FOR ALL TO authenticated 
USING (public.is_agency_director(agency_id) OR public.is_platform_admin());


-- --- 3.3. REQUÊTES D'INSCRIPTION & ADMINISTRATION ---

-- platform_admins
DROP POLICY IF EXISTS "admins_view_self" ON public.platform_admins;
CREATE POLICY "admins_view_self" ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

-- agency_registration_requests
DROP POLICY IF EXISTS "public_insert_request" ON public.agency_registration_requests;
CREATE POLICY "public_insert_request" ON public.agency_registration_requests FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "admin_manage_requests" ON public.agency_registration_requests;
CREATE POLICY "admin_manage_requests" ON public.agency_registration_requests FOR ALL TO authenticated 
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


-- --- 3.4. DONNÉES MÉTIER (PROPRIÉTÉS, LOCATAIRES, CONTRATS, ETC.) ---

-- Fonction générique pour les tables liées par agency_id
DO $$ 
DECLARE 
    t_name TEXT;
    tables_to_secure TEXT[] := ARRAY[
        'owners', 'tenants', 'properties', 'contracts', 'financial_statements', 
        'financial_transactions', 'tickets', 'cash_transactions', 'contract_templates', 
        'inventories', 'property_tenant_assignments', 'managed_contracts', 
        'agency_subscriptions', 'agency_rankings', 'agency_service_modules',
        'announcement_interests'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_secure LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t_name AND table_schema = 'public') THEN
            EXECUTE format('DROP POLICY IF EXISTS "agency_member_all_%I" ON public.%I', t_name, t_name);
            EXECUTE format('CREATE POLICY "agency_member_all_%I" ON public.%I FOR ALL TO authenticated 
                           USING (public.is_agency_member(agency_id)) 
                           WITH CHECK (public.is_agency_member(agency_id))', t_name, t_name);
        END IF;
    END LOOP;
END $$;

-- Exceptions & Compléments Métier :

-- rent_receipts (lié via contract)
DROP POLICY IF EXISTS "receipts_agency_access" ON public.rent_receipts;
CREATE POLICY "receipts_agency_access" ON public.rent_receipts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = rent_receipts.contract_id AND public.is_agency_member(c.agency_id)));

-- subscription_payments (lié via subscription)
DROP POLICY IF EXISTS "payments_agency_access" ON public.subscription_payments;
CREATE POLICY "payments_agency_access" ON public.subscription_payments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_subscriptions s WHERE s.id = subscription_payments.subscription_id AND public.is_agency_member(s.agency_id)));

-- announcements (Visibilité publique)
DROP POLICY IF EXISTS "announcements_public_read" ON public.announcements;
CREATE POLICY "announcements_public_read" ON public.announcements FOR SELECT TO anon, authenticated 
USING (is_active = true OR public.is_agency_member(agency_id));

DROP POLICY IF EXISTS "announcements_agency_manage" ON public.announcements;
CREATE POLICY "announcements_agency_manage" ON public.announcements FOR ALL TO authenticated 
USING (public.is_agency_member(agency_id)) WITH CHECK (public.is_agency_member(agency_id));


-- --- 3.5. COMMUNICATION & PORTAIL ---

-- messages
DROP POLICY IF EXISTS "messages_personal_access" ON public.messages;
CREATE POLICY "messages_personal_access" ON public.messages FOR ALL TO authenticated 
USING (sender_id = auth.uid() OR receiver_id = auth.uid()) 
WITH CHECK (sender_id = auth.uid());

-- notifications
DROP POLICY IF EXISTS "notifications_owner_access" ON public.notifications;
CREATE POLICY "notifications_owner_access" ON public.notifications FOR ALL TO authenticated 
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- notification_settings
DROP POLICY IF EXISTS "notif_settings_owner_access" ON public.notification_settings;
CREATE POLICY "notif_settings_owner_access" ON public.notification_settings FOR ALL TO authenticated 
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- --- 3.6. COLLABORATION INTER-AGENCES (LOGIQUE V22) ---

-- collaboration_requests
DROP POLICY IF EXISTS "collab_requests_access" ON public.collaboration_requests;
CREATE POLICY "collab_requests_access" ON public.collaboration_requests FOR SELECT TO authenticated 
USING (public.is_agency_member(requester_agency_id) OR public.is_agency_member(target_agency_id));

-- Accès aux tiers partagés (Owners/Tenants)
DROP POLICY IF EXISTS "shared_tenants_select" ON public.tenants;
CREATE POLICY "shared_tenants_select" ON public.tenants FOR SELECT TO authenticated 
USING (id IN (
    SELECT tier_id FROM public.collaboration_requests 
    WHERE tier_type = 'tenant' AND status = 'approved' 
    AND public.is_agency_member(requester_agency_id)
));

DROP POLICY IF EXISTS "shared_owners_select" ON public.owners;
CREATE POLICY "shared_owners_select" ON public.owners FOR SELECT TO authenticated 
USING (id IN (
    SELECT tier_id FROM public.collaboration_requests 
    WHERE tier_type = 'owner' AND status = 'approved' 
    AND public.is_agency_member(requester_agency_id)
));


-- --- 3.7. LOGS & AUDITS ---

-- audit_logs
DROP POLICY IF EXISTS "audit_logs_director_read" ON public.audit_logs;
CREATE POLICY "audit_logs_director_read" ON public.audit_logs FOR SELECT TO authenticated 
USING (
    public.is_platform_admin() 
    OR (user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.agency_users au 
        WHERE au.user_id = auth.uid() AND au.role = 'director'
        AND au.agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = audit_logs.user_id)
    )
);

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);


-- =============================================================================
-- ÉTAPE 4 : SÉCURISATION DES SCHÉMAS (RECOMMANDATION SUPABASE)
-- =============================================================================

REVOKE ALL ON SCHEMA public FROM public;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Verification finale
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY rowsecurity ASC;
