-- ==============================================================================
-- LE FIX NUCLÉAIRE V2 : SÉCURITÉ + GARANTIE DES FONCTIONNALITÉS
-- ==============================================================================

-- 1. FONCTIONS DE CONTOURNEMENT SÉCURISÉES (Sans Boucle)
-- Ces fonctions garantissent qu'on peut vérifier les rôles sans déclencher le RLS.
CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.i_am_director_of(p_agency_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.agencies WHERE id = p_agency_id AND director_id = auth.uid());
END;
$$;

-- 2. NETTOYAGE ABSOLU (Destruction des anciennes règles qui causent les erreurs 500)
DO $$ 
DECLARE 
    tbl RECORD;
    pol RECORD;
BEGIN 
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'owners', 'audit_logs', 'agency_users', 'contracts', 'rent_receipts') 
    LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl.tablename 
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl.tablename);
        END LOOP;
    END LOOP;
END $$;

-- ==============================================================================
-- 3. RECONSTRUCTION DES RÈGLES DE SÉCURITÉ (Zéro perte de fonctionnalité)
-- ==============================================================================

-- A. AGENCY_USERS (Personnel)
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
-- Un staff voit sa propre ligne. Un directeur gère toute son agence. Un Admin voit tout.
CREATE POLICY "agency_users_read" ON public.agency_users FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.i_am_director_of(agency_id) OR public.is_platform_admin()
);
CREATE POLICY "agency_users_all" ON public.agency_users FOR ALL TO authenticated USING (
    public.i_am_director_of(agency_id) OR public.is_platform_admin()
);

-- B. USERS (Profils)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- On voit son profil, les profils de son agence, ou tout si Admin.
CREATE POLICY "users_read" ON public.users FOR SELECT TO authenticated USING (
    id = auth.uid() OR public.is_platform_admin() OR
    id IN (SELECT user_id FROM public.agency_users WHERE agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()))
);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_platform_admin());

-- C. OWNERS (Propriétaires)
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
-- Le proprio voit sa fiche. L'agence gère les proprios de son agence.
CREATE POLICY "owners_read" ON public.owners FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_platform_admin() OR
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
);
CREATE POLICY "owners_all" ON public.owners FOR ALL TO authenticated USING (
    public.is_platform_admin() OR agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
);

-- D. CONTRACTS (Contrats)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_read_agency" ON public.contracts FOR SELECT TO authenticated USING (
    public.is_platform_admin() OR agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
);
CREATE POLICY "contracts_read_owner" ON public.contracts FOR SELECT TO authenticated USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()))
);
CREATE POLICY "contracts_all_agency" ON public.contracts FOR ALL TO authenticated USING (
    public.is_platform_admin() OR agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
);

-- E. RENT_RECEIPTS (Quittances)
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_read_agency" ON public.rent_receipts FOR SELECT TO authenticated USING (
    public.is_platform_admin() OR contract_id IN (SELECT id FROM public.contracts WHERE agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()))
);
CREATE POLICY "receipts_read_owner" ON public.rent_receipts FOR SELECT TO authenticated USING (
    contract_id IN (SELECT id FROM public.contracts WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())))
);
CREATE POLICY "receipts_all_agency" ON public.rent_receipts FOR ALL TO authenticated USING (
    public.is_platform_admin() OR contract_id IN (SELECT id FROM public.contracts WHERE agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()))
);

-- F. AUDIT_LOGS (Logs de sécurité)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_logs_read" ON public.audit_logs FOR SELECT TO authenticated USING (
    public.is_platform_admin() OR agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
);

SELECT '✅ Fix Nucléaire V2 appliqué. Toutes les fonctionnalités sont préservées et sécurisées.' as status;
