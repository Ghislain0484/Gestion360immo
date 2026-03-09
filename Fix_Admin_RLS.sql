-- =============================================================
-- GESTION360 : FIX ADMIN RLS
-- Autorise les administrateurs de la plateforme (Super Admins)
-- à voir et gérer toutes les données de toutes les agences.
-- =============================================================

-- 1. Helper : Vérifier si l'utilisateur est un admin de plateforme (SÉCURISÉ)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
$$;

-- 2. Appliquer les droits d'exécution
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 3. AJOUT DES POLITIQUES ADMIN SUR LES TABLES CLÉS

-- AGENCIES
DROP POLICY IF EXISTS "admin_all_agencies" ON public.agencies;
CREATE POLICY "admin_all_agencies" ON public.agencies FOR ALL TO authenticated 
USING (public.is_platform_admin());

-- AGENCY_USERS
DROP POLICY IF EXISTS "admin_all_agency_users" ON public.agency_users;
CREATE POLICY "admin_all_agency_users" ON public.agency_users FOR ALL TO authenticated 
USING (public.is_platform_admin());

-- TENANTS
DROP POLICY IF EXISTS "admin_all_tenants" ON public.tenants;
CREATE POLICY "admin_all_tenants" ON public.tenants FOR ALL TO authenticated 
USING (public.is_platform_admin());

-- OWNERS
DROP POLICY IF EXISTS "admin_all_owners" ON public.owners;
CREATE POLICY "admin_all_owners" ON public.owners FOR ALL TO authenticated 
USING (public.is_platform_admin());

-- PROPERTIES
DROP POLICY IF EXISTS "admin_all_properties" ON public.properties;
CREATE POLICY "admin_all_properties" ON public.properties FOR ALL TO authenticated 
USING (public.is_platform_admin());

-- CONTRACTS
DROP POLICY IF EXISTS "admin_all_contracts" ON public.contracts;
CREATE POLICY "admin_all_contracts" ON public.contracts FOR ALL TO authenticated 
USING (public.is_platform_admin());

-- RENT_RECEIPTS
DROP POLICY IF EXISTS "admin_all_receipts" ON public.rent_receipts;
CREATE POLICY "admin_all_receipts" ON public.rent_receipts FOR ALL TO authenticated 
USING (public.is_platform_admin());

-- FINISH
SELECT 'Admin RLS Policies Applied' AS status;
