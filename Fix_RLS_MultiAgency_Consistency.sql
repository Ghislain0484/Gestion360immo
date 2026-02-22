-- =============================================================
-- GESTION360 : FIX RLS COHERENCE MULTI-AGENCES
-- Ce script remplace la logique restrictive my_agency_id() par
-- une vérification d'appartenance (Membership) robuste.
-- =============================================================

-- 1. Désactiver la fonction problématique (ou ne plus l'utiliser)
-- Nous conservons la fonction pour la compatibilité mais les politiques ne l'utiliseront plus.

-- 2. Mise à jour des politiques pour OWNERS
DROP POLICY IF EXISTS "agency_crud_owners" ON public.owners;
CREATE POLICY "agency_crud_owners" ON public.owners FOR ALL TO authenticated 
USING (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()))
WITH CHECK (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()));

-- 3. Mise à jour des politiques pour TENANTS (Cible principale du bug)
DROP POLICY IF EXISTS "agency_crud_tenants" ON public.tenants;
CREATE POLICY "agency_crud_tenants" ON public.tenants FOR ALL TO authenticated 
USING (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()))
WITH CHECK (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()));

-- 4. Mise à jour des politiques pour PROPERTIES
DROP POLICY IF EXISTS "agency_crud_properties" ON public.properties;
CREATE POLICY "agency_crud_properties" ON public.properties FOR ALL TO authenticated 
USING (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()))
WITH CHECK (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()));

-- 5. Mise à jour des politiques pour CONTRACTS
DROP POLICY IF EXISTS "agency_crud_contracts" ON public.contracts;
CREATE POLICY "agency_crud_contracts" ON public.contracts FOR ALL TO authenticated 
USING (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()))
WITH CHECK (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()));

-- 6. Mise à jour des politiques pour RENT_RECEIPTS
DROP POLICY IF EXISTS "agency_crud_receipts" ON public.rent_receipts;
CREATE POLICY "agency_crud_receipts" ON public.rent_receipts FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        JOIN public.agency_users au ON au.agency_id = c.agency_id
        WHERE c.id = public.rent_receipts.contract_id
        AND au.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.contracts c
        JOIN public.agency_users au ON au.agency_id = c.agency_id
        WHERE c.id = public.rent_receipts.contract_id
        AND au.user_id = auth.uid()
    )
);

-- 7. Mise à jour des politiques pour FINANCIAL_STATEMENTS
DROP POLICY IF EXISTS "agency_crud_financial" ON public.financial_statements;
CREATE POLICY "agency_crud_financial" ON public.financial_statements FOR ALL TO authenticated 
USING (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()))
WITH CHECK (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()));

-- 8. Mise à jour des politiques pour AGENCIES
-- Rendre l'agence visible à tous ses membres
DROP POLICY IF EXISTS "agency_user_read_own" ON public.agencies;
CREATE POLICY "agency_user_read_own" ON public.agencies FOR SELECT TO authenticated 
USING (id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()));

-- 9. Mise à jour des politiques pour AGENCY_USERS (Sécurisation lecture liste)
DROP POLICY IF EXISTS "agency_read_own_users" ON public.agency_users;
CREATE POLICY "agency_read_own_users" ON public.agency_users FOR SELECT TO authenticated 
USING (agency_id IN (SELECT au2.agency_id FROM public.agency_users au2 WHERE au2.user_id = auth.uid()));

-- 10. Mise à jour des politiques pour ANNOUNCEMENTS
DROP POLICY IF EXISTS "agency_crud_announcements" ON public.announcements;
CREATE POLICY "agency_crud_announcements" ON public.announcements FOR ALL TO authenticated 
USING (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()))
WITH CHECK (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()));

-- 11. Mise à jour des politiques pour AGENCY_SUBSCRIPTIONS
DROP POLICY IF EXISTS "agency_read_own_subscription" ON public.agency_subscriptions;
CREATE POLICY "agency_read_own_subscription" ON public.agency_subscriptions FOR SELECT TO authenticated 
USING (agency_id IN (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid()));

-- Vérification
SELECT 'RLS Multi-Agency Consistency Applied' AS status;
