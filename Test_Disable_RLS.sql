-- SOLUTION TEMPORAIRE: Désactiver RLS pour tester
-- ⚠️ ATTENTION: À utiliser UNIQUEMENT pour tester si le problème vient de RLS
-- ⚠️ NE PAS LAISSER EN PRODUCTION

-- Désactiver RLS sur agencies
ALTER TABLE agencies DISABLE ROW LEVEL SECURITY;

-- Test: Essayez maintenant de modifier une agence depuis le dashboard
-- Si ça fonctionne, le problème vient bien des permissions RLS

-- Pour réactiver RLS après le test:
-- ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
