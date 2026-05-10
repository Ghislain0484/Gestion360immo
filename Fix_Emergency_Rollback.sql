-- ==============================================================================
-- ROLLBACK D'URGENCE : RESTAURATION DE LA PRODUCTION (ERREURS 500)
-- À exécuter immédiatement dans le SQL Editor de Supabase
-- ==============================================================================

-- 1. RESTAURATION DU SEARCH_PATH DES FONCTIONS
-- Annule la restriction qui empêchait les fonctions de trouver auth.uid()
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN 
        SELECT p.oid::regprocedure AS proc_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
    LOOP
        EXECUTE format('ALTER FUNCTION %s RESET search_path', r.proc_name);
    END LOOP;
END $$;

-- 2. DÉSACTIVATION DU RLS SUR LES TABLES CRITIQUES
-- L'activation du RLS sur agency_users a causé une boucle de récursion infinie 
-- avec les autres tables (owners, users, audit_logs) qui dépendent d'elle.
-- Nous désactivons le RLS pour rétablir instantanément le fonctionnement de l'application.
ALTER TABLE public.agency_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_receipts DISABLE ROW LEVEL SECURITY;

SELECT '✅ Rollback d''urgence effectué. L''application devrait refonctionner normalement.' as status;
