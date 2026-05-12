-- ============================================================
-- GESTION360 — ISOLATION STRICTE DES SUPPRESSIONS
-- ============================================================
-- Ce script désactive les règles "ALL" permissives qui permettaient
-- à n'importe quel employé de supprimer des données financières.
-- ============================================================

-- 1. MODULAR_TRANSACTIONS
-- Supprimer les règles ALL trop larges
DROP POLICY IF EXISTS "modular_tx_all" ON public.modular_transactions;
DROP POLICY IF EXISTS "modular_transactions_master_agency_all" ON public.modular_transactions;
DROP POLICY IF EXISTS "Access for agency users" ON public.modular_transactions;

-- Recréer la règle mais UNIQUEMENT pour SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "modular_transactions_write" ON public.modular_transactions;
CREATE POLICY "modular_transactions_write"
ON public.modular_transactions
FOR INSERT
TO authenticated
WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR is_platform_admin());

DROP POLICY IF EXISTS "modular_transactions_update" ON public.modular_transactions;
CREATE POLICY "modular_transactions_update"
ON public.modular_transactions
FOR UPDATE
TO authenticated
USING (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR is_platform_admin());


-- 2. OWNER_TRANSACTIONS
DROP POLICY IF EXISTS "owner_transactions_master_agency_all" ON public.owner_transactions;
DROP POLICY IF EXISTS "Agency users can manage owner transactions" ON public.owner_transactions;

DROP POLICY IF EXISTS "owner_transactions_write" ON public.owner_transactions;
CREATE POLICY "owner_transactions_write"
ON public.owner_transactions
FOR INSERT
TO authenticated
WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR is_platform_admin());

DROP POLICY IF EXISTS "owner_transactions_update" ON public.owner_transactions;
CREATE POLICY "owner_transactions_update"
ON public.owner_transactions
FOR UPDATE
TO authenticated
USING (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR is_platform_admin());


-- 3. RENT_RECEIPTS
DROP POLICY IF EXISTS "rent_receipts_master_agency_all" ON public.rent_receipts;
DROP POLICY IF EXISTS "receipts_all_agency" ON public.rent_receipts;

DROP POLICY IF EXISTS "rent_receipts_write" ON public.rent_receipts;
CREATE POLICY "rent_receipts_write"
ON public.rent_receipts
FOR INSERT
TO authenticated
WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR is_platform_admin());

DROP POLICY IF EXISTS "rent_receipts_update" ON public.rent_receipts;
CREATE POLICY "rent_receipts_update"
ON public.rent_receipts
FOR UPDATE
TO authenticated
USING (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR is_platform_admin());
