-- ==============================================================================
-- LE FIX NUCLÉAIRE : RÉINITIALISATION COMPLÈTE DU RLS (ZÉRO RECURSION)
-- Ce script supprime TOUTES les anciennes politiques instables et les remplace
-- par des requêtes plates 100% garanties sans boucle infinie.
-- ==============================================================================

DO $$ 
DECLARE 
    tbl RECORD;
    pol RECORD;
BEGIN 
    -- 1. Nettoyage absolu : on supprime toutes les politiques des tables clés
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'owners', 'audit_logs', 'agency_users', 'contracts', 'rent_receipts') 
    LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl.tablename 
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl.tablename);
        END LOOP;
    END LOOP;
END $$;

-- ==============================================================================
-- 2. RECONSTRUCTION DES POLITIQUES (PLATES ET SÉCURISÉES)
-- ==============================================================================

-- A. AGENCY_USERS (La base de la sécurité)
-- Règle stricte : On ne peut lire que sa propre ligne. Zéro sous-requête, zéro boucle.
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_users_read_own" ON public.agency_users FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "agency_users_crud_own" ON public.agency_users FOR ALL TO authenticated USING (user_id = auth.uid());

-- B. USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Un utilisateur peut lire son profil, ou les profils des membres de son agence
CREATE POLICY "users_read_safe" ON public.users FOR SELECT TO authenticated USING (
    id = auth.uid() OR
    id IN (
        SELECT user_id FROM public.agency_users 
        WHERE agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
    )
);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid());

-- C. OWNERS
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_read_safe" ON public.owners FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
);
CREATE POLICY "owners_all_safe" ON public.owners FOR ALL TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
);

-- D. AUDIT_LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_logs_read" ON public.audit_logs FOR SELECT TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
);

-- E. CONTRACTS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_read_agency" ON public.contracts FOR SELECT TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
);
CREATE POLICY "contracts_read_owner" ON public.contracts FOR SELECT TO authenticated USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()))
);

-- F. RENT_RECEIPTS
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_read_agency" ON public.rent_receipts FOR SELECT TO authenticated USING (
    contract_id IN (SELECT id FROM public.contracts WHERE agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()))
);
CREATE POLICY "receipts_read_owner" ON public.rent_receipts FOR SELECT TO authenticated USING (
    contract_id IN (SELECT id FROM public.contracts WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())))
);

SELECT '✅ Fix Nucléaire Appliqué. Le RLS est activé et totalement purgé de ses boucles infinies.' as status;
