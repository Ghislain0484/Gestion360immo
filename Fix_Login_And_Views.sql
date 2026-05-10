-- ==============================================================================
-- FIX URGENCE 500 : CONNEXION, PROPRIÉTAIRES ET AVERTISSEMENT VUE
-- À exécuter dans le SQL Editor de Supabase
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RESTAURATION DU SEARCH_PATH (RÉSOUT LES ERREURS 500 GLOBALES)
-- Le patch précédent a restreint le search_path à 'public', ce qui empêche 
-- les fonctions de trouver 'auth.uid()' ou les extensions comme 'uuid_generate'.
-- On rétablit un search_path complet et sécurisé.
-- ------------------------------------------------------------------------------
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
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, auth, extensions', r.proc_name);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. CORRECTION DU RLS SUR agency_users (SÉCURITÉ ANTI-BOUCLE)
-- Permet à l'utilisateur de lire SA ligne directement, évitant toute boucle.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read their agency users" ON public.agency_users;
CREATE POLICY "Users can read their agency users" ON public.agency_users
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR 
    public.check_agency_access(agency_id)
);

-- Assurer que check_agency_access appartient à postgres (contourne RLS proprement)
ALTER FUNCTION public.check_agency_access(UUID) OWNER TO postgres;

-- ------------------------------------------------------------------------------
-- 3. CORRECTION DU WARNING SUR LA VUE (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
ALTER VIEW public.site_financial_summary SET (security_invoker = on);

SELECT '✅ Fix d''urgence (500) et avertissement appliqués avec succès' as status;
