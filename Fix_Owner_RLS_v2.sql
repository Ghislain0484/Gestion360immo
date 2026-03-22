-- ================================================================
-- GESTION360: FIX RLS OWNER PORTAL (v2 - Self-Contained)
-- Ce script restaure l'accès des propriétaires à leurs données.
-- Exécutez ce script dans Supabase > SQL Editor
-- ================================================================

-- 0. HELPER FUNCTION: check_user_membership (S'assure que la fonction existe)
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

GRANT EXECUTE ON FUNCTION public.check_user_membership(UUID) TO authenticated;

-- 1. PROPERTIES: Autoriser l'agence ET le propriétaire
DROP POLICY IF EXISTS "agency_crud_properties" ON public.properties;
CREATE POLICY "agency_owner_read_properties" ON public.properties
  FOR SELECT TO authenticated
  USING (
    public.check_user_membership(public.properties.agency_id) -- Agence
    OR 
    EXISTS (
      SELECT 1 FROM public.owners o 
      WHERE o.id = public.properties.owner_id 
      AND o.user_id = auth.uid()
    ) -- Propriétaire
  );

-- 2. CONTRACTS: Autoriser l'agence ET le propriétaire
DROP POLICY IF EXISTS "agency_crud_contracts" ON public.contracts;
CREATE POLICY "agency_owner_read_contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    public.check_user_membership(public.contracts.agency_id) -- Agence
    OR 
    EXISTS (
      SELECT 1 FROM public.properties p 
      JOIN public.owners o ON o.id = p.owner_id
      WHERE p.id = public.contracts.property_id AND o.user_id = auth.uid()
    ) -- Propriétaire
  );

-- 3. RENT_RECEIPTS: Autoriser l'agence ET le propriétaire
DROP POLICY IF EXISTS "agency_crud_receipts" ON public.rent_receipts;
CREATE POLICY "agency_owner_read_receipts" ON public.rent_receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = public.rent_receipts.contract_id AND public.check_user_membership(c.agency_id)
    ) -- Agence
    OR
    EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.properties p ON p.id = c.property_id
      JOIN public.owners o ON o.id = p.owner_id
      WHERE c.id = public.rent_receipts.contract_id AND o.user_id = auth.uid()
    ) -- Propriétaire
  );

-- 4. MODULAR_TRANSACTIONS: Autoriser l'agence ET le propriétaire (pour les reversements)
DROP POLICY IF EXISTS "Access for agency users" ON public.modular_transactions;
CREATE POLICY "agency_owner_read_transactions" ON public.modular_transactions
  FOR SELECT TO authenticated
  USING (
    public.check_user_membership(public.modular_transactions.agency_id) -- Agence
    OR
    public.modular_transactions.related_owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()) -- Propriétaire direct
    OR
    EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE p.id = public.modular_transactions.related_property_id AND o.user_id = auth.uid()
    ) -- Via propriété
  );

-- 5. TENANTS: Autoriser le proprio à voir ses locataires
DROP POLICY IF EXISTS "agency_crud_tenants" ON public.tenants;
CREATE POLICY "agency_owner_read_tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    public.check_user_membership(public.tenants.agency_id) -- Agence
    OR
    EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.properties p ON p.id = c.property_id
      JOIN public.owners o ON o.id = p.owner_id
      WHERE c.tenant_id = public.tenants.id AND o.user_id = auth.uid()
    ) -- Propriétaire
  );

-- 6. OWNERS: Autoriser le proprio à voir sa propre fiche
DROP POLICY IF EXISTS "agency_crud_owners" ON public.owners;
CREATE POLICY "agency_owner_read_owners" ON public.owners
  FOR SELECT TO authenticated
  USING (
    public.check_user_membership(public.owners.agency_id) -- Agence
    OR
    public.owners.user_id = auth.uid() -- Soi-même
  );

SELECT 'RLS Owner Access Fixed' AS status;
