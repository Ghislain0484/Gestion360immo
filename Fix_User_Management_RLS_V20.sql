-- =============================================================
-- FIX V20 : SUPER RPC DE DÉTECTION ET PONTAGE AUTH/PUBLIC
-- =============================================================
-- Ce script :
-- 1. Crée un RPC capable de voir les utilisateurs dans 'auth' ET 'public'.
-- 2. Répare manuellement le compte de Gisele qui est "bloqué" entre les deux.

-- 1. SUPER RPC DE DÉTECTION (SECURITY DEFINER)
-- Cette fonction est vitale pour éviter les erreurs 409/23503.
CREATE OR REPLACE FUNCTION public.get_user_by_email_v20(p_email TEXT)
RETURNS TABLE (id UUID, email TEXT, first_name TEXT, last_name TEXT, source TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY 
    -- Cas A : L'utilisateur existe déjà dans public.users
    SELECT u.id, u.email, u.first_name, u.last_name, 'public'::TEXT as source 
    FROM public.users u 
    WHERE LOWER(u.email) = LOWER(p_email)
    
    UNION ALL
    
    -- Cas B : L'utilisateur existe dans auth.users mais PAS ENCORE dans public.users
    -- (C'est le cas de Gisele)
    SELECT au.id, au.email, 
           (au.raw_user_meta_data->>'first_name')::TEXT, 
           (au.raw_user_meta_data->>'last_name')::TEXT, 
           'auth'::TEXT as source
    FROM auth.users au 
    WHERE LOWER(au.email) = LOWER(p_email)
    AND au.id NOT IN (SELECT pu.id FROM public.users pu WHERE LOWER(pu.email) = LOWER(p_email));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_by_email_v20(TEXT) TO authenticated;

-- 2. RÉPARATION MANUELLE POUR GISELE
-- On s'assure qu'elle n'a pas de restes de fichiers ou d'ID temporaires dans public.users
DELETE FROM public.users WHERE LOWER(email) = 'giselealla@gicosarl.net';
-- On nettoie d'éventuels liens d'agence orphelins
DELETE FROM public.agency_users WHERE user_id NOT IN (SELECT id FROM public.users) AND user_id NOT IN (SELECT id FROM auth.users);

-- 3. RELANCE DU SCHEMA
NOTIFY pgrst, 'reload schema';
SELECT 'Correction V20 (Super RPC + Nettoyage Gisele) appliquée' AS status;
