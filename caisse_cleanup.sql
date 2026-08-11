-- =========================================================================
-- NETTOYAGE ET RECONCILIATION DE LA CAISSE ET DES REVERSEMENTS PROPRIÉTAIRES
-- =========================================================================
BEGIN;

-- 1. Identifier et supprimer les doublons exacts dans modular_transactions
-- (Mêmes montants, dates de transaction proches, même catégorie 'owner_payout')
WITH duplicates_exacts AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY agency_id, amount, transaction_date, related_owner_id, category
               ORDER BY created_at DESC
           ) as rn
    FROM public.modular_transactions
    WHERE category = 'owner_payout'
      AND agency_id = '96e00e23-e240-411e-bd20-95a15603f6cc' -- GEA-HOLDING SAU
)
DELETE FROM public.modular_transactions
WHERE id IN (SELECT id FROM duplicates_exacts WHERE rn > 1);


-- 2. Supprimer les doublons de reversement non liés à un propriétaire dans modular_transactions
-- (Où une écriture identique existe avec le propriétaire correctement lié, pour éviter le double débit)
DELETE FROM public.modular_transactions t1
WHERE t1.agency_id = '96e00e23-e240-411e-bd20-95a15603f6cc'
  AND t1.category = 'owner_payout'
  AND t1.related_owner_id IS NULL
  AND EXISTS (
      SELECT 1 
      FROM public.modular_transactions t2
      WHERE t2.agency_id = t1.agency_id
        AND t2.id <> t1.id
        AND t2.category = 'owner_payout'
        AND t2.related_owner_id IS NOT NULL
        AND ABS(t2.amount - t1.amount) < 0.01
        AND ABS(extract(epoch from t2.transaction_date::timestamp) - extract(epoch from t1.transaction_date::timestamp)) <= 172800
  );


-- 3. Nettoyer les doublons exacts dans owner_transactions
WITH duplicates_owner_tx AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY agency_id, owner_id, type, montant, date_transaction::date
               ORDER BY created_at DESC
           ) as rn
    FROM public.owner_transactions
    WHERE agency_id = '96e00e23-e240-411e-bd20-95a15603f6cc'
)
DELETE FROM public.owner_transactions
WHERE id IN (SELECT id FROM duplicates_owner_tx WHERE rn > 1);

COMMIT;
