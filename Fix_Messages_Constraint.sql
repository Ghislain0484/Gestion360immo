-- =====================================================
-- Fix_Messages_Constraint.sql
-- Supprime la contrainte NOT NULL sur receiver_id
-- =====================================================

-- S'assurer que la colonne peut accepter des valeurs NULL
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;

-- Notification de succès
SELECT 'Contrainte NOT NULL supprimée de messages(receiver_id) ✅' AS status;
