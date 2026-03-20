-- =============================================================
-- GESTION360 : SUPPRESSION DES DOUBLONS DE CAISSE
-- Ce script retire les écritures automatiques de réservation
-- pour ne garder que les PAIEMENTS RÉELS dans la caisse.
-- =============================================================

-- 1. Supprimer les transactions de catégorie "Logement" et "Hôtellerie"
-- car elles font double emploi avec les "Paiements Séjour" réels.
DELETE FROM public.modular_transactions 
WHERE category IN ('Logement', 'Hôtellerie');

-- 2. Bonus : S'assurer que les paiements existants sont bien marqués comme 'income'
UPDATE public.modular_transactions 
SET type = 'income' 
WHERE category = 'stay_payment';

SELECT 'Nettoyage des doublons terminé ! La caisse affiche désormais uniquement les paiements réels.' AS status;
