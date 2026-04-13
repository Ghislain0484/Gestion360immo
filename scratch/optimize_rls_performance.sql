-- ==========================================================
-- OPTIMISATION RLS HAUTE PERFORMANCE (SECURITY DEFINER)
-- Résolution des Timeouts (Code 57014) et Erreurs 500
-- ==========================================================

-- 1. Nettoyage des fonctions existantes (si besoin)
DROP FUNCTION IF EXISTS public.get_auth_agency_id() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_agency_admin() CASCADE;

-- 2. Création de la fonction get_auth_agency_id
-- STABLE : Dit à Postgres que le résultat est identique pour un même utilisateur pendant la durée d'une requête.
-- SECURITY DEFINER : Permet à la fonction de contourner le RLS de la table agency_users.
CREATE OR REPLACE FUNCTION public.get_auth_agency_id()
RETURNS UUID 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
    SELECT agency_id 
    FROM public.agency_users 
    WHERE user_id = auth.uid() 
    LIMIT 1;
$$;

-- 3. Création de la fonction check_is_agency_admin
CREATE OR REPLACE FUNCTION public.check_is_agency_admin()
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.agency_users 
        WHERE user_id = auth.uid() 
        AND role IN ('director', 'manager')
    );
$$;

-- 4. Attribution des droits d'exécution
GRANT EXECUTE ON FUNCTION public.get_auth_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_agency_admin() TO authenticated;

-- 5. Standardisation des politiques RLS pour les tables majeures
DO $$ 
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['properties', 'owners', 'tenants', 'contracts', 'rent_receipts', 'modular_transactions', 'owner_transactions'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- a. Sélection (Optimisation massive)
        EXECUTE format('DROP POLICY IF EXISTS "%I_read_policy" ON public.%I', t, t);
        EXECUTE format('
            CREATE POLICY "%I_read_policy" ON public.%I
            FOR SELECT USING (agency_id = get_auth_agency_id())
        ', t, t);
        
        -- b. Suppression (Politique unifiée)
        EXECUTE format('DROP POLICY IF EXISTS "Managers can delete %I" ON public.%I', t, t);
        EXECUTE format('
            CREATE POLICY "Managers can delete %I" ON public.%I
            FOR DELETE USING (agency_id = get_auth_agency_id() AND check_is_agency_admin())
        ', t, t);
        
        RAISE NOTICE 'RLS optimisé pour la table %', t;
    END LOOP;
END $$;

-- 6. Optimisation spéciale pour audit_logs
DROP POLICY IF EXISTS "Managers can view agency audit logs" ON public.audit_logs;
CREATE POLICY "Managers can view agency audit logs" ON public.audit_logs
FOR SELECT USING (agency_id = get_auth_agency_id() AND check_is_agency_admin());

-- 7. Ajout d'index de couverture si manquants (Garantie de vitesse)
CREATE INDEX IF NOT EXISTS idx_agency_users_user_id_agency_id ON public.agency_users(user_id, agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agency_id_created_at ON public.audit_logs(agency_id, created_at DESC);
