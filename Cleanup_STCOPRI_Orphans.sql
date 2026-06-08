-- ==============================================================================
-- CLEANUP STCOPRI ORPHANS - MIGRATION DE RÉPARATION DE DONNÉES
-- ==============================================================================
-- Un ancien script de diagnostic/réparation d'intégrité (diagnostic_users_integrity.sql)
-- avait associé par erreur des utilisateurs de test et d'autres agences à STCOPRI.
-- Ce script nettoie les liaisons erronées pour ne laisser que les membres réels de STCOPRI.

-- 1. Retirer les liaisons agency_users non valides pour STCOPRI
DELETE FROM public.agency_users 
WHERE agency_id = 'a83b7ddd-ea8c-4cbc-81e6-3cd097087b4e'
  AND user_id NOT IN (
    '5cee741f-d37b-42a2-b5c8-540e9e4574af', -- BOUBACAR DIABIRA (Directeur STCOPRI)
    '135c28f5-3db9-4aae-8ef6-61da7bb5d9d1'  -- Nahomie Mompoho (Manager STCOPRI)
  );

-- 2. Mettre à jour l'agency_id de Nahomie Mompoho dans public.users pour cohérence
UPDATE public.users 
SET agency_id = 'a83b7ddd-ea8c-4cbc-81e6-3cd097087b4e'
WHERE id = '135c28f5-3db9-4aae-8ef6-61da7bb5d9d1';

SELECT '✅ Données de l''agence STCOPRI nettoyées avec succès.' as status;
