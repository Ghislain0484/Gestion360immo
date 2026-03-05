-- ============================================================
-- Migration COMPLÈTE : Paiements partiels + Fix RLS
-- Table : rent_receipts
-- Date  : 2026-03-05
-- ============================================================
-- INSTRUCTIONS :
--   1. Ouvrir Supabase Dashboard → SQL Editor
--   2. Coller et exécuter CE SCRIPT ENTIER (tout sélectionner)
--   3. Vérifier que le message "Migration OK" apparaît en bas
-- ============================================================

BEGIN;

-- ============================================================
-- PARTIE 1 : Ajout des colonnes pour paiements partiels
-- ============================================================

-- Montant effectivement versé lors de ce paiement
ALTER TABLE public.rent_receipts
  ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT NULL;

-- Solde restant à verser pour solder le mois
ALTER TABLE public.rent_receipts
  ADD COLUMN IF NOT EXISTS balance_due numeric DEFAULT 0;

-- Statut du paiement
ALTER TABLE public.rent_receipts
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'full'
    CHECK (payment_status IN ('full', 'partial'));

-- Mise à jour des lignes existantes pour cohérence
UPDATE public.rent_receipts
SET
  amount_paid    = total_amount,
  balance_due    = 0,
  payment_status = 'full'
WHERE amount_paid IS NULL;


-- ============================================================
-- PARTIE 2 : Fix des politiques RLS
-- (réinitialisation complète pour éviter les conflits)
-- ============================================================

-- Supprimer toutes les anciennes politiques RLS
DROP POLICY IF EXISTS rent_receipts_select_policy ON public.rent_receipts;
DROP POLICY IF EXISTS rent_receipts_insert_policy ON public.rent_receipts;
DROP POLICY IF EXISTS rent_receipts_update_policy ON public.rent_receipts;
DROP POLICY IF EXISTS rent_receipts_delete_policy ON public.rent_receipts;
DROP POLICY IF EXISTS "rent_receipts_select" ON public.rent_receipts;
DROP POLICY IF EXISTS "rent_receipts_insert" ON public.rent_receipts;
DROP POLICY IF EXISTS "rent_receipts_update" ON public.rent_receipts;
DROP POLICY IF EXISTS "rent_receipts_delete" ON public.rent_receipts;
DROP POLICY IF EXISTS "Allow select for agency members" ON public.rent_receipts;
DROP POLICY IF EXISTS "Allow insert for agency members" ON public.rent_receipts;
DROP POLICY IF EXISTS "Allow update for agency members" ON public.rent_receipts;
DROP POLICY IF EXISTS "Allow delete for agency members" ON public.rent_receipts;

-- Activer RLS sur la table
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;

-- SELECT : voir les quittances de son agence
CREATE POLICY rent_receipts_select_policy ON public.rent_receipts
  FOR SELECT TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_users
      WHERE user_id = auth.uid()
    )
  );

-- INSERT : créer des quittances pour son agence
CREATE POLICY rent_receipts_insert_policy ON public.rent_receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_users
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE : modifier les quittances de son agence
CREATE POLICY rent_receipts_update_policy ON public.rent_receipts
  FOR UPDATE TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_users
      WHERE user_id = auth.uid()
    )
  );

-- DELETE : supprimer les quittances de son agence
CREATE POLICY rent_receipts_delete_policy ON public.rent_receipts
  FOR DELETE TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_users
      WHERE user_id = auth.uid()
    )
  );

COMMIT;

-- ============================================================
-- VÉRIFICATION : doit afficher les 3 nouvelles colonnes
-- ============================================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'rent_receipts'
  AND column_name IN ('amount_paid', 'balance_due', 'payment_status')
ORDER BY column_name;

-- Doit afficher 4 politiques (select, insert, update, delete)
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'rent_receipts'
ORDER BY policyname;

-- Message de confirmation
SELECT '✅ Migration OK — Paiements partiels activés et RLS corrigé' AS message;
