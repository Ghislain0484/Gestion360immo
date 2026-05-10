-- ==============================================================================
-- GESTION DES ADMINISTRATEURS PLATEFORME (Standard & Super Admin)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_platform_admin(
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role TEXT DEFAULT 'admin',
    p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $function$
DECLARE
    v_user_id UUID;
    v_admin_id UUID;
BEGIN
    -- 1. Créer l'utilisateur dans auth.users via l'API interne de Supabase si possible
    -- NOTE: En SQL pur via RPC, on utilise généralement auth.uid() pour créer, 
    -- mais ici on va insérer dans public.users et laisser le trigger gérer ou faire l'invite.
    
    -- Pour simplifier et assurer la compatibilité, on vérifie si l'utilisateur existe déjà
    SELECT id INTO v_user_id FROM public.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        -- On crée l'entrée dans public.users (le mot de passe devra être géré via Auth invite ou manuellement)
        INSERT INTO public.users (email, first_name, last_name, is_active)
        VALUES (p_email, p_first_name, p_last_name, true)
        RETURNING id INTO v_user_id;
    END IF;

    -- 2. Créer l'entrée dans platform_admins
    INSERT INTO public.platform_admins (user_id, role, permissions, is_active)
    VALUES (v_user_id, p_role, p_permissions, true)
    ON CONFLICT (user_id) DO UPDATE 
    SET role = EXCLUDED.role, 
        permissions = EXCLUDED.permissions,
        is_active = true
    RETURNING id INTO v_admin_id;

    RETURN json_build_object(
        'success', true,
        'user_id', v_user_id,
        'admin_id', v_admin_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Droits d'exécution
GRANT EXECUTE ON FUNCTION public.create_platform_admin TO authenticated;
