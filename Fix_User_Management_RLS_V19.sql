-- =============================================================
-- FIX V19 : RÉPARATION RELATIONNELLE ET RECHERCHE GLOBALE
-- =============================================================
-- Ce script :
-- 1. Ajoute une fonction RPC pour détecter les emails existants sans être bloqué par RLS.
-- 2. Nettoie les enregistrements orphelins ou conflictuels.
-- 3. Renforce les clés étrangères entre auth.users et public.users.

-- 1. CRÉATION D'UNE FONCTION DE RECHERCHE GLOBALE (SECURITY DEFINER)
-- Permet à un directeur d'agence de savoir si un email existe déjà, même s'il ne peut pas le voir normalement.
CREATE OR REPLACE FUNCTION public.get_user_by_email_v19(p_email TEXT)
RETURNS TABLE (id UUID, email TEXT, first_name TEXT, last_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY 
    SELECT u.id, u.email, u.first_name, u.last_name 
    FROM public.users u 
    WHERE LOWER(u.email) = LOWER(p_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_by_email_v19(TEXT) TO authenticated;

-- 2. NETTOYAGE DES DOUBLONS CONFLICTUELS (Gisele)
DO $$ 
DECLARE
    v_target_email TEXT := 'giselealla@gicosarl.net';
BEGIN
    -- Supprimer les liens d'agence orphelins pour cet email
    DELETE FROM public.agency_users 
    WHERE user_id IN (SELECT id FROM public.users WHERE LOWER(email) = LOWER(v_target_email));
    
    -- Supprimer l'utilisateur de public.users pour permettre une recréation propre
    DELETE FROM public.users WHERE LOWER(email) = LOWER(v_target_email);
    
    -- Note: On ne touche pas à auth.users manuellement ici, signUp s'en chargera ou renverra l'existant.
END $$;

-- 3. VÉRIFICATION ET RENFORCEMENT DES FK
-- On s'assure que la contrainte V18 est toujours là et pointe au bon endroit.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_fkey_v18;
ALTER TABLE public.users ADD CONSTRAINT users_auth_fkey_v19 FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. AUTORISATION AUDIT LOGS POUR ÉVITER LES ÉCHECS SECONDAIRES
-- Parfois l'audit log bloque l'inscription s'il échoue.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert for all" ON public.audit_logs;
CREATE POLICY "Allow insert for all" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Notification de succès
NOTIFY pgrst, 'reload schema';
SELECT 'Correction V19 appliquée avec succès' AS status;
