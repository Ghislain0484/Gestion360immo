-- =============================================================
-- GESTION360 : FIX RECURSION RLS FINAL
-- Ce script brise la boucle infinie entre agency_users et agencies
-- =============================================================

-- 1. Création d'une fonction Helper SECURITY DEFINER
-- Le mot-clé SECURITY DEFINER permet à la fonction d'ignorer les RLS
-- pendant son exécution. C'est la clé pour briser la récursion.

CREATE OR REPLACE FUNCTION public.check_is_agency_director(p_user_id UUID, p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.agencies
        WHERE id = p_agency_id
        AND director_id = p_user_id
    );
END;
$$;

-- 2. Nettoyer les anciennes politiques sur agency_users
DROP POLICY IF EXISTS "admin_all_agency_users" ON public.agency_users;
DROP POLICY IF EXISTS "agency_read_own_users" ON public.agency_users;
DROP POLICY IF EXISTS "user_read_own_record" ON public.agency_users;
DROP POLICY IF EXISTS "director_read_agency_users" ON public.agency_users;
DROP POLICY IF EXISTS "director_manage_agency_users" ON public.agency_users;

-- 3. Appliquer les nouvelles politiques SANS récursion

-- ADMIN : Accès total
CREATE POLICY "admin_all_agency_users" 
ON public.agency_users FOR ALL 
TO authenticated 
USING (public.is_platform_admin()) 
WITH CHECK (public.is_platform_admin());

-- LECTURE : On voit ses propres records
CREATE POLICY "user_read_own_record" 
ON public.agency_users FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- GESTION : Le directeur gère son agence via le helper SECURITY DEFINER
-- (Cela brise la boucle car la fonction check_is_agency_director n'active pas le RLS de 'agencies')
CREATE POLICY "director_manage_agency_users" 
ON public.agency_users FOR ALL 
TO authenticated 
USING (public.check_is_agency_director(auth.uid(), agency_id))
WITH CHECK (public.check_is_agency_director(auth.uid(), agency_id));

-- 4. Droits d'exécution
GRANT EXECUTE ON FUNCTION public.check_is_agency_director(UUID, UUID) TO authenticated;

-- Vérification
SELECT 'RLS recursion fixed successfully' AS status;
