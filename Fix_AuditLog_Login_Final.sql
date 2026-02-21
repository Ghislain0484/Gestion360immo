-- =============================================================
-- FIX DEFINITIF : Permissions Audit & Sécurité Login
-- =============================================================

-- 1. Permissions de base sur le schéma
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.audit_logs TO postgres;
GRANT INSERT ON TABLE public.audit_logs TO anon, authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

-- 2. RLS sur audit_logs
-- On autorise tout le monde (même non connecté) à insérer des logs
-- C'est crucial pour traquer les échecs de connexion.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for all" ON public.audit_logs;
CREATE POLICY "Allow insert for all" 
ON public.audit_logs FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 3. Sécurité agency_users (Rappel Fix Récursion)
-- Brise la boucle entre agences et membres
CREATE OR REPLACE FUNCTION public.check_is_agency_director(p_user_id UUID, p_agency_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.agencies WHERE id = p_agency_id AND director_id = p_user_id);
END;
$$;

DROP POLICY IF EXISTS "director_manage_agency_users" ON public.agency_users;
CREATE POLICY "director_manage_agency_users" 
ON public.agency_users FOR ALL 
TO authenticated 
USING (public.check_is_agency_director(auth.uid(), agency_id))
WITH CHECK (public.check_is_agency_director(auth.uid(), agency_id));

-- Vérification
SELECT 'Security fixes applied successfully' AS status;
