-- Diagnostic pour identifier les doublons ou conflits d'ID
-- Copiez ce code et collez-le dans le SQL Editor de Supabase
SELECT 'auth.users' as source, id, email, created_at FROM auth.users WHERE LOWER(email) = 'giselealla@gicosarl.net'
UNION ALL
SELECT 'public.users' as source, id, email, created_at FROM public.users WHERE LOWER(email) = 'giselealla@gicosarl.net';
