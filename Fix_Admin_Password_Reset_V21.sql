-- =============================================================
-- FIX V21 : RÉINITIALISATION ADMIN DU MOT DE PASSE
-- =============================================================
-- Ce script permet à un Directeur d'agence de définir un nouveau 
-- mot de passe pour ses agents sans avoir besoin du lien email.

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(p_user_id UUID, p_new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    -- 1. Vérification de sécurité : l'appelant est-il Directeur de l'agence de la cible ?
    IF NOT EXISTS (
        SELECT 1 
        FROM public.agency_users au_admin
        JOIN public.agency_users au_target ON au_admin.agency_id = au_target.agency_id
        WHERE au_admin.user_id = auth.uid() 
        AND au_admin.role = 'director'
        AND au_target.user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Non autorisé : Seul un Directeur peut modifier le mot de passe d''un agent de son agence.';
    END IF;

    -- 2. Validation basique du mot de passe
    IF length(p_new_password) < 6 THEN
        RAISE EXCEPTION 'Le mot de passe doit contenir au moins 6 caractères.';
    END IF;

    -- 3. Mise à jour de auth.users
    -- Supabase utilise le cryptage standard BCrypt via pgcrypto
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;

SELECT 'Correction V21 (Admin Password Reset) installée' AS status;
