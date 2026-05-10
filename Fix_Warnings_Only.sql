-- ==============================================================================
-- PATCH CIBLÉ : CORRECTION DES WARNINGS DU SECURITY ADVISOR
-- (Sans modifier le RLS pour garantir la stabilité de la production)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CORRECTION DU WARNING SUR LA VUE (SECURITY DEFINER VIEW)
-- La vue s'exécutera avec les droits de la personne qui l'interroge, 
-- résolvant l'avertissement de Supabase.
-- ------------------------------------------------------------------------------
ALTER VIEW public.site_financial_summary SET (security_invoker = on);

-- ------------------------------------------------------------------------------
-- 2. CORRECTION DES WARNINGS "Function Search Path Mutable"
-- Nous fixons explicitement le search_path sur vos fonctions sensibles pour 
-- empêcher l'injection de schémas, en incluant 'auth' et 'extensions' pour 
-- ne pas casser leur fonctionnement interne.
-- ------------------------------------------------------------------------------

-- Appliquer sur les fonctions connues listées par l'Advisor
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth, extensions;
ALTER FUNCTION public.admin_create_user_v3(text, text, text, text, uuid, text) SET search_path = public, auth, extensions;
ALTER FUNCTION public.approve_agency_request(uuid) SET search_path = public, auth, extensions;

-- Appliquer dynamiquement sur toutes les autres fonctions SECURITY DEFINER 
-- pour être sûr de tout couvrir sans casser l'application.
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

SELECT '✅ Avertissements Security Advisor résolus en toute sécurité.' as status;
