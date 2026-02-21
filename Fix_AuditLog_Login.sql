-- =============================================================
-- FIX : Permissions audit_logs pour les erreurs de login
-- Autorise l'insertion anonyme afin de logger les échecs de connexion
-- =============================================================

-- 1. Autoriser l'insertion pour TOUS (y compris anon)
-- On utilise CHECK (true) car on veut pouvoir logger même sans être connecté
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public can insert audit logs" ON public.audit_logs;

CREATE POLICY "Allow insert for all" 
ON public.audit_logs FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 2. Vérification rapide du compte de Maurel Agohi
-- Cela nous aidera à comprendre pourquoi le login échoue
SELECT id, email, first_name, last_name, is_active FROM public.users WHERE email = 'maurel.agohi@gmail.com';
