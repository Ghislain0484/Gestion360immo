-- Diagnostic pour identifier le conflit d'email pour l'admin
-- Copiez ce code et collez-le dans le SQL Editor de Supabase pour voir les deux comptes qui bloquent

SELECT 'Compte Admin Actuel' as type, id, email, first_name, last_name, created_at 
FROM public.users 
WHERE first_name = 'Admin' AND last_name = 'Gestion360'

UNION ALL

SELECT 'Compte Conflictuel' as type, id, email, first_name, last_name, created_at 
FROM public.users 
WHERE email = 'goldsalem97@gmail.com';
