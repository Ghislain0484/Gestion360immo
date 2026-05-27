-- ==============================================================================
-- GESTION360 - RLS DÉFINITIF & ANTI-RÉCURSION MULTI-AGENCES (VERSION ULTRA-STABLE)
-- ==============================================================================
-- Ce script :
-- 1. Crée une fonction SECURITY DEFINER ultra-rapide pour vérifier l'appartenance à une agence.
--    Puisque la fonction est SECURITY DEFINER, elle contourne les règles RLS
--    lors de la lecture de public.agency_users, éliminant totalement l'erreur de récursion infinie (42P17).
-- 2. Nettoie toutes les politiques existantes.
-- 3. Reconstruit des politiques RLS propres, performantes et sécurisées.
-- ==============================================================================

-- 1. CRÉATION DE LA FONCTION ANTI-RÉCURSION
CREATE OR REPLACE FUNCTION public.check_user_membership(p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    -- Si l'utilisateur est administrateur plateforme, il a accès à tout
    IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND is_active = true) THEN
        RETURN TRUE;
    END IF;

    -- Sinon, on vérifie s'il fait partie de l'agence (sans récursion RLS car SECURITY DEFINER)
    RETURN EXISTS (
        SELECT 1 FROM public.agency_users 
        WHERE user_id = auth.uid() 
          AND agency_id = p_agency_id
    );
END;
$$;

ALTER FUNCTION public.check_user_membership(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_user_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_membership(UUID) TO anon;


-- 2. NETTOYAGE COMPLET DES POLITIQUES PRÉCÉDENTES (Évite les conflits)
DO $$ 
DECLARE 
    tbl RECORD;
    pol RECORD;
BEGIN 
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'owners', 'tenants', 'properties', 'contracts', 'rent_receipts', 'financial_statements', 'agencies', 'agency_users', 'announcements', 'agency_subscriptions') 
    LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl.tablename 
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl.tablename);
        END LOOP;
    END LOOP;
END $$;


-- ==============================================================================
-- 3. RECONSTRUCTION DES POLITIQUES RLS ULTRA-STABLES (BASSÉES SUR LE MEMBERSHIP)
-- ==============================================================================

-- A. AGENCIES (Agences)
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agencies_read_policy" ON public.agencies FOR SELECT TO authenticated 
USING (public.check_user_membership(id));

CREATE POLICY "agencies_admin_policy" ON public.agencies FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND role = 'super_admin'));

-- B. AGENCY_USERS (Liaison Personnel)
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_users_read_policy" ON public.agency_users FOR SELECT TO authenticated 
USING (public.check_user_membership(agency_id));

CREATE POLICY "agency_users_all_policy" ON public.agency_users FOR ALL TO authenticated 
USING (
    user_id = auth.uid() -- Droit de modifier ou insérer sa propre ligne
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM public.agencies WHERE id = agency_id AND director_id = auth.uid()) -- Directeur
)
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM public.agencies WHERE id = agency_id AND director_id = auth.uid())
);

-- C. USERS (Profils Publics)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_policy" ON public.users FOR SELECT TO authenticated 
USING (
    id = auth.uid() -- Voir son propre profil
    OR EXISTS (
        SELECT 1 FROM public.agency_users au 
        WHERE au.user_id = public.users.id 
          AND public.check_user_membership(au.agency_id)
    ) -- Voir les profils de ses collègues d'agence
);

CREATE POLICY "users_all_policy" ON public.users FOR ALL TO authenticated 
USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND is_active = true));

-- D. OWNERS (Propriétaires)
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_all_policy" ON public.owners FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- E. TENANTS (Locataires)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_all_policy" ON public.tenants FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- F. PROPERTIES (Biens)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_all_policy" ON public.properties FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- G. CONTRACTS (Contrats)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_all_policy" ON public.contracts FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- H. RENT_RECEIPTS (Quittances/Caisse)
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_all_policy" ON public.rent_receipts FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c 
        WHERE c.id = public.rent_receipts.contract_id 
          AND public.check_user_membership(c.agency_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.contracts c 
        WHERE c.id = public.rent_receipts.contract_id 
          AND public.check_user_membership(c.agency_id)
    )
);

-- I. FINANCIAL_STATEMENTS (Comptabilité)
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_all_policy" ON public.financial_statements FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- J. ANNOUNCEMENTS (Annonces)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_all_policy" ON public.announcements FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- K. AGENCY_SUBSCRIPTIONS (Abonnements)
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_read_policy" ON public.agency_subscriptions FOR SELECT TO authenticated 
USING (public.check_user_membership(agency_id));

-- L. AUDIT_LOGS (Logs de sécurité)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_logs_read_policy" ON public.audit_logs FOR SELECT TO authenticated 
USING (public.check_user_membership(agency_id));


SELECT '✅ Système anti-récursion appliqué avec succès. L''ensemble de l''application est stabilisé !' AS status;
