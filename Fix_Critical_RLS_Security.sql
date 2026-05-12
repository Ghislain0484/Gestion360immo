-- ============================================================
-- GESTION360 — CORRECTIFS CRITIQUES RLS
-- À appliquer dans le SQL Editor de Supabase
-- Date : 2026-05-12
-- Auditeur : Antigravity Engineering
-- ============================================================
-- ⚠️  EXÉCUTER CE SCRIPT UNE SEULE FOIS EN PRODUCTION
-- ⚠️  Faire un backup de la base AVANT toute modification
-- ============================================================


-- ============================================================
-- 1. CORRECTION CRITIQUE : Isolation multi-tenant des agences
-- La politique "Allow admins to read agencies" utilisait USING(true)
-- ce qui permettait à tout utilisateur authentifié de lire toutes les agences.
-- On la remplace par un check strict : admin OU propriétaire de l'agence.
-- ============================================================

-- Supprimer les anciennes politiques trop permissives
DROP POLICY IF EXISTS "Allow admins to read agencies" ON public.agencies;
DROP POLICY IF EXISTS "Agency users can read their own agency" ON public.agencies;

-- Recréer une politique d'isolation stricte multi-tenant
CREATE POLICY "agencies_read_isolated"
ON public.agencies
FOR SELECT
TO authenticated
USING (
    -- Admins de la plateforme peuvent tout voir
    EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE user_id = auth.uid()
    )
    OR
    -- Les utilisateurs agence ne voient QUE leurs agences
    id IN (
        SELECT agency_id FROM public.agency_users
        WHERE user_id = auth.uid()
    )
    OR
    -- Le directeur peut voir ses agences (fallback)
    director_id = auth.uid()
);

-- ============================================================
-- 2. CORRECTION : Politique DELETE sur modular_transactions
-- Seuls les directeurs et chefs d'agence peuvent supprimer
-- ============================================================

DROP POLICY IF EXISTS "modular_transactions_delete" ON public.modular_transactions;

CREATE POLICY "modular_transactions_delete"
ON public.modular_transactions
FOR DELETE
TO authenticated
USING (
    agency_id IN (
        SELECT agency_id FROM public.agency_users
        WHERE user_id = auth.uid()
        AND role IN ('director', 'manager')
    )
);

-- ============================================================
-- 3. CORRECTION : Politique DELETE sur rent_receipts
-- ============================================================

DROP POLICY IF EXISTS "rent_receipts_delete" ON public.rent_receipts;

CREATE POLICY "rent_receipts_delete"
ON public.rent_receipts
FOR DELETE
TO authenticated
USING (
    agency_id IN (
        SELECT agency_id FROM public.agency_users
        WHERE user_id = auth.uid()
        AND role IN ('director', 'manager')
    )
);

-- ============================================================
-- 4. CORRECTION : Politique DELETE sur owner_transactions
-- ============================================================

DROP POLICY IF EXISTS "owner_transactions_delete" ON public.owner_transactions;

CREATE POLICY "owner_transactions_delete"
ON public.owner_transactions
FOR DELETE
TO authenticated
USING (
    agency_id IN (
        SELECT agency_id FROM public.agency_users
        WHERE user_id = auth.uid()
        AND role IN ('director', 'manager')
    )
);

-- ============================================================
-- 5. ISOLATION : Les propriétaires ne voient que leur propre agence
-- Patch pour la table owners : empêche la cross-lecture
-- ============================================================

DROP POLICY IF EXISTS "owners_read_own_agency" ON public.owners;

CREATE POLICY "owners_read_own_agency"
ON public.owners
FOR SELECT
TO authenticated
USING (
    -- Admins
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
    OR
    -- Utilisateurs agence : ne voient que les proprios de leur agence
    agency_id IN (
        SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
    )
    OR
    -- Le proprio lui-même via son user_id
    user_id = auth.uid()
);

-- ============================================================
-- 6. Vérification finale — lister les politiques actives
-- ============================================================

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'agencies', 'modular_transactions', 'rent_receipts',
        'owner_transactions', 'owners'
    )
ORDER BY tablename, policyname;
