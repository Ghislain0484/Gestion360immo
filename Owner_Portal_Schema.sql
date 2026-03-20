-- ==============================================================================
-- ADD USER_ID TO OWNERS
-- ==============================================================================
ALTER TABLE IF EXISTS public.owners
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================================================
-- RLS POLICIES FOR OWNERS PORTAL
-- ==============================================================================

-- 1. Owners can read their own profile
CREATE POLICY "Les propriétaires peuvent lire leur propre profil"
ON public.owners
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Owners can read their properties
CREATE POLICY "Les propriétaires voient leurs propres biens"
ON public.properties
FOR SELECT
TO authenticated
USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

-- 3. Owners can read their contracts
CREATE POLICY "Les propriétaires voient les contrats de leurs biens"
ON public.contracts
FOR SELECT
TO authenticated
USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

-- 4. Owners can read their rent receipts
CREATE POLICY "Les propriétaires voient les reçus de leurs biens"
ON public.rent_receipts
FOR SELECT
TO authenticated
USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

-- 5. Owners can read their tenants (via contracts)
CREATE POLICY "Les propriétaires voient leurs locataires via contrats"
ON public.tenants
FOR SELECT
TO authenticated
USING (id IN (
    SELECT tenant_id FROM public.contracts 
    WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())
));

-- 6. Owners can read inventory (etats des lieux) of their properties
CREATE POLICY "Les propriétaires voient les états des lieux de leurs biens"
ON public.inventory
FOR SELECT
TO authenticated
USING (property_id IN (
    SELECT id FROM public.properties 
    WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())
));

-- 7. Owners can read tickets/maintenance of their properties
CREATE POLICY "Les propriétaires voient les tickets de travaux de leurs biens"
ON public.tickets
FOR SELECT
TO authenticated
USING (property_id IN (
    SELECT id FROM public.properties 
    WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())
));
