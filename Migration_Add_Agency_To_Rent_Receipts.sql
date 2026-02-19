-- =====================================================
-- Migration: Ajouter agency_id à rent_receipts
-- =====================================================
-- Date: 2026-02-06
-- Description: Ajoute la colonne agency_id à la table rent_receipts
--              pour permettre le filtrage direct par agence sans jointure

-- IMPORTANT: Exécutez ce script dans Supabase SQL Editor

BEGIN;

-- 1. Ajouter la colonne agency_id (nullable temporairement)
-- =====================================================
ALTER TABLE public.rent_receipts 
ADD COLUMN IF NOT EXISTS agency_id UUID;

-- 2. Backfill: Remplir agency_id depuis contracts
-- =====================================================
-- Pour toutes les quittances existantes, récupérer l'agency_id du contrat associé
UPDATE public.rent_receipts rr
SET agency_id = c.agency_id
FROM public.contracts c
WHERE rr.contract_id = c.id
AND rr.agency_id IS NULL;

-- 3. Vérifier que toutes les lignes ont été mises à jour
-- =====================================================
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM public.rent_receipts
    WHERE agency_id IS NULL;
    
    IF null_count > 0 THEN
        RAISE WARNING 'Attention: % quittances n''ont pas d''agency_id après le backfill', null_count;
    ELSE
        RAISE NOTICE 'Succès: Toutes les quittances ont un agency_id';
    END IF;
END $$;

-- 4. Rendre la colonne NOT NULL
-- =====================================================
ALTER TABLE public.rent_receipts 
ALTER COLUMN agency_id SET NOT NULL;

-- 5. Ajouter la contrainte de clé étrangère
-- =====================================================
ALTER TABLE public.rent_receipts
ADD CONSTRAINT fk_rent_receipts_agency
FOREIGN KEY (agency_id) REFERENCES public.agencies(id)
ON DELETE CASCADE;

-- 6. Créer un index pour améliorer les performances
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_rent_receipts_agency 
ON public.rent_receipts(agency_id);

-- 7. Créer un index composite pour les requêtes fréquentes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_rent_receipts_agency_date 
ON public.rent_receipts(agency_id, payment_date DESC);

-- 8. Mettre à jour les politiques RLS si nécessaire
-- =====================================================
-- Vérifier si des politiques RLS existent déjà
DO $$
BEGIN
    -- Supprimer les anciennes politiques si elles existent
    DROP POLICY IF EXISTS rent_receipts_select_policy ON public.rent_receipts;
    DROP POLICY IF EXISTS rent_receipts_insert_policy ON public.rent_receipts;
    DROP POLICY IF EXISTS rent_receipts_update_policy ON public.rent_receipts;
    DROP POLICY IF EXISTS rent_receipts_delete_policy ON public.rent_receipts;
    
    -- Activer RLS si ce n'est pas déjà fait
    ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;
    
    -- Créer les nouvelles politiques basées sur agency_id
    -- SELECT: Les utilisateurs peuvent voir les quittances de leur agence
    CREATE POLICY rent_receipts_select_policy ON public.rent_receipts
        FOR SELECT
        USING (
            agency_id IN (
                SELECT agency_id 
                FROM public.agency_users 
                WHERE user_id = auth.uid()
            )
        );
    
    -- INSERT: Les utilisateurs peuvent créer des quittances pour leur agence
    CREATE POLICY rent_receipts_insert_policy ON public.rent_receipts
        FOR INSERT
        WITH CHECK (
            agency_id IN (
                SELECT agency_id 
                FROM public.agency_users 
                WHERE user_id = auth.uid()
            )
        );
    
    -- UPDATE: Les utilisateurs peuvent modifier les quittances de leur agence
    CREATE POLICY rent_receipts_update_policy ON public.rent_receipts
        FOR UPDATE
        USING (
            agency_id IN (
                SELECT agency_id 
                FROM public.agency_users 
                WHERE user_id = auth.uid()
            )
        );
    
    -- DELETE: Les utilisateurs peuvent supprimer les quittances de leur agence
    CREATE POLICY rent_receipts_delete_policy ON public.rent_receipts
        FOR DELETE
        USING (
            agency_id IN (
                SELECT agency_id 
                FROM public.agency_users 
                WHERE user_id = auth.uid()
            )
        );
    
    RAISE NOTICE 'Politiques RLS créées avec succès';
END $$;

COMMIT;

-- =====================================================
-- Vérification post-migration
-- =====================================================
-- Exécutez ces requêtes pour vérifier que tout fonctionne

-- 1. Vérifier la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rent_receipts'
AND column_name = 'agency_id';

-- 2. Vérifier les contraintes
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'rent_receipts'
AND kcu.column_name = 'agency_id';

-- 3. Vérifier les index
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'rent_receipts'
AND indexdef LIKE '%agency_id%';

-- 4. Vérifier les politiques RLS
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'rent_receipts';

-- 5. Compter les quittances par agence
SELECT 
    a.name AS agency_name,
    COUNT(rr.id) AS receipt_count,
    SUM(rr.total_amount) AS total_amount
FROM public.rent_receipts rr
JOIN public.agencies a ON rr.agency_id = a.id
GROUP BY a.id, a.name
ORDER BY receipt_count DESC;
