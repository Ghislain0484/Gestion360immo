-- =============================================================
-- GESTION360 : Correction finale des agences
-- Executer dans Supabase → SQL Editor
-- =============================================================

-- 1. Détacher l'agence "Test" qui a été liée par erreur
-- (On retire director_id et on supprime l'entrée dans agency_users)
DELETE FROM public.agency_users
WHERE user_id = '7e1bb674-66ee-46f2-aec2-550231b660b0'
  AND agency_id = (SELECT id FROM public.agencies WHERE name = 'Test' LIMIT 1);

UPDATE public.agencies
SET director_id = NULL
WHERE name = 'Test' AND director_id = '7e1bb674-66ee-46f2-aec2-550231b660b0';

-- 2. Lier le directeur à "GICO 8KILOS" (Yaou)
-- ID : eb3ccc80-8318-487c-89d3-ec621776b1e1
SELECT public.link_director_to_agency('eb3ccc80-8318-487c-89d3-ec621776b1e1');

-- 3. Vérification finale : Doit afficher GICO 8KILOS et GICO SARL
SELECT
    a.name AS "Agence",
    a.city AS "Ville",
    au.role AS "Rôle"
FROM public.agency_users au
JOIN public.agencies a ON a.id = au.agency_id
WHERE au.user_id = '7e1bb674-66ee-46f2-aec2-550231b660b0';
