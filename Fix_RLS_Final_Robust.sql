-- =============================================================
-- GESTION360 : FIX RLS FINAL - RUPTURE DE RÉCURSION
-- Ce script définit des fonctions SECURITY DEFINER pour
-- interroger les agences sans déclencher de boucle infinie RLS.
-- =============================================================

-- 1. Helper : Vérifier si l'utilisateur appartient à une agence (SÉCURISÉ)
CREATE OR REPLACE FUNCTION public.check_user_membership(p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
$$;

-- 2. Helper : Récupérer les IDs des agences de l'utilisateur (SÉCURISÉ)
CREATE OR REPLACE FUNCTION public.get_my_agencies_list()
RETURNS TABLE (a_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid();
$$;

-- 3. Appliquer les droits d'exécution
GRANT EXECUTE ON FUNCTION public.check_user_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_agencies_list() TO authenticated;

-- 4. RE-SÉCURISATION DE AGENCY_USERS (Lecture de ses propres droits et ceux de ses agences)
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_read_own_record" ON public.agency_users;
DROP POLICY IF EXISTS "agency_read_own_users" ON public.agency_users;
DROP POLICY IF EXISTS "director_manage_agency_users" ON public.agency_users;
DROP POLICY IF EXISTS "admin_all_agency_users" ON public.agency_users;

CREATE POLICY "user_read_own_record" ON public.agency_users FOR SELECT TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "agency_read_own_users" ON public.agency_users FOR SELECT TO authenticated 
USING (public.check_user_membership(agency_id));

CREATE POLICY "director_manage_agency_users" ON public.agency_users FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id));

-- 5. RE-SÉCURISATION DE AGENCIES
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency_user_read_own" ON public.agencies;
DROP POLICY IF EXISTS "Agencies are visible by their members" ON public.agencies;

CREATE POLICY "agencies_visible_to_members" ON public.agencies FOR SELECT TO authenticated 
USING (public.check_user_membership(id));

-- 6. DÉBLOCAGE DE LA TABLE USERS (Pour fetchUserWithAgency au login)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own" ON public.users;
CREATE POLICY "users_read_own" ON public.users FOR SELECT TO authenticated 
USING (id = auth.uid());

-- 7. MISE À JOUR GLOBAL DES TABLES DATA (PROPERTIES, TENANTS, OWNERS, CONTRACTS)
-- On utilise le helper check_user_membership pour plus de performance et de clarté.

-- TENANTS
DROP POLICY IF EXISTS "agency_crud_tenants" ON public.tenants;
CREATE POLICY "agency_crud_tenants" ON public.tenants FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- OWNERS
DROP POLICY IF EXISTS "agency_crud_owners" ON public.owners;
CREATE POLICY "agency_crud_owners" ON public.owners FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- PROPERTIES
DROP POLICY IF EXISTS "agency_crud_properties" ON public.properties;
CREATE POLICY "agency_crud_properties" ON public.properties FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- CONTRACTS
DROP POLICY IF EXISTS "agency_crud_contracts" ON public.contracts;
CREATE POLICY "agency_crud_contracts" ON public.contracts FOR ALL TO authenticated 
USING (public.check_user_membership(agency_id))
WITH CHECK (public.check_user_membership(agency_id));

-- RENT_RECEIPTS (Basé sur le contrat)
DROP POLICY IF EXISTS "agency_crud_receipts" ON public.rent_receipts;
CREATE POLICY "agency_crud_receipts" ON public.rent_receipts FOR ALL TO authenticated
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

-- Vérification finale
SELECT 'RLS Final Robust Applied' AS status;
