-- ================================================================
-- FIX: ACCÈS DU PROPRIÉTAIRE À SES DONNÉES
-- VERSION AUTONOME - sans dépendance à check_user_membership
-- Exécutez ce script dans Supabase > SQL Editor
-- ================================================================

-- ============================================================
-- 1. PROPERTIES
-- ============================================================
DROP POLICY IF EXISTS "owner_read_own_properties" ON public.properties;
CREATE POLICY "owner_read_own_properties" ON public.properties
  FOR SELECT TO authenticated
  USING (
    -- Accès agence normal
    EXISTS (
      SELECT 1 FROM public.agency_users au
      WHERE au.agency_id = public.properties.agency_id
        AND au.user_id = auth.uid()
    )
    OR
    -- Accès propriétaire via owner_id
    EXISTS (
      SELECT 1 FROM public.owners o
      WHERE o.id = public.properties.owner_id
        AND o.user_id = auth.uid()
    )
  );

-- ============================================================
-- 2. CONTRACTS
-- ============================================================
DROP POLICY IF EXISTS "owner_read_own_contracts" ON public.contracts;
CREATE POLICY "owner_read_own_contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_users au
      WHERE au.agency_id = public.contracts.agency_id
        AND au.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE p.id = public.contracts.property_id
        AND o.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. RENT_RECEIPTS
-- ============================================================
DROP POLICY IF EXISTS "owner_read_own_receipts" ON public.rent_receipts;
CREATE POLICY "owner_read_own_receipts" ON public.rent_receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.agency_users au ON au.agency_id = c.agency_id
      WHERE c.id = public.rent_receipts.contract_id
        AND au.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.properties p ON p.id = c.property_id
      JOIN public.owners o ON o.id = p.owner_id
      WHERE c.id = public.rent_receipts.contract_id
        AND o.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. TENANTS
-- ============================================================
DROP POLICY IF EXISTS "owner_read_own_tenants" ON public.tenants;
CREATE POLICY "owner_read_own_tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_users au
      WHERE au.agency_id = public.tenants.agency_id
        AND au.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.properties p ON p.id = c.property_id
      JOIN public.owners o ON o.id = p.owner_id
      WHERE c.tenant_id = public.tenants.id
        AND o.user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. TICKETS (si la table existe)
-- ============================================================
DROP POLICY IF EXISTS "owner_read_own_tickets" ON public.tickets;
CREATE POLICY "owner_read_own_tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.agency_users au ON au.agency_id = p.agency_id
      WHERE p.id = public.tickets.property_id
        AND au.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE p.id = public.tickets.property_id
        AND o.user_id = auth.uid()
    )
  );

-- ============================================================
-- VÉRIFICATION: Bien du proprio goldsalem97
-- Le résultat doit montrer le bien lié à ce propriétaire
-- ============================================================
SELECT 
  p.id AS property_id,
  p.title AS bien,
  p.owner_id,
  o.first_name || ' ' || o.last_name AS proprietaire,
  o.user_id AS compte_auth_lie
FROM public.properties p
LEFT JOIN public.owners o ON o.id = p.owner_id
WHERE o.email ILIKE 'goldsalem97@gmail.com'
   OR o.user_id = (SELECT id FROM auth.users WHERE email ILIKE 'goldsalem97@gmail.com' LIMIT 1);
