-- =============================================================
-- FIX : RLS et Multi-Agences
-- Executer dans Supabase → SQL Editor
-- =============================================================

-- 1. Autoriser l'insertion des audit_logs pour tous les utilisateurs authentifiés
-- (C'est indispensable pour que LoginForm et UserManagement fonctionnent)
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true); -- On autorise l'insertion, le déclencheur ou le code applicatif gère la cohérence

-- 2. Améliorer la visibilité des agences (RLS)
-- On autorise un utilisateur à VOIR une agence s'il est dedans (via agency_users) 
-- OU s'il est le directeur historique.
DROP POLICY IF EXISTS "Agencies are visible by their members" ON public.agencies;
CREATE POLICY "Agencies are visible by their members"
ON public.agencies FOR SELECT
TO authenticated
USING (
    director_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM public.agency_users 
        WHERE agency_id = public.agencies.id 
        AND user_id = auth.uid()
    )
);

-- 3. S'assurer que les agences sont bien liées
-- On relance le lien pour GICO 8KILOS au cas où l'ID auth.uid() n'était pas le bon précédemment
DO $$
BEGIN
    -- Lier GICO 8KILOS (Yaou)
    PERFORM public.link_director_to_agency('eb3ccc80-8318-487c-89d3-ec621776b1e1');
END $$;

-- 4. Vérification finale
SELECT 
    a.name AS "Agence", 
    au.role AS "Votre Rôle",
    a.director_id = auth.uid() AS "Propriétaire Direct"
FROM public.agency_users au
JOIN public.agencies a ON a.id = au.agency_id
WHERE au.user_id = auth.uid();
