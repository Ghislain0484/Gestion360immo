-- =============================================================================
-- GESTION360 - FONCTIONS DE GESTION DES ADMINISTRATEURS PLATEFORME
-- Permet de créer des administrateurs avec permissions granulaires
-- =============================================================================

-- Fonction pour créer un nouvel administrateur plateforme
CREATE OR REPLACE FUNCTION public.create_platform_admin(
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role TEXT, -- 'admin' ou 'super_admin'
    p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. Vérification de sécurité : l'appelant est-il un super_admin ?
    IF NOT EXISTS (
        SELECT 1 FROM public.platform_admins 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) THEN
        -- Note: On autorise si aucun admin n'existe encore (premier setup)
        IF EXISTS (SELECT 1 FROM public.platform_admins) THEN
            RAISE EXCEPTION 'Non autorisé : Seul un Super Admin peut créer d''autres administrateurs.';
        END IF;
    END IF;

    -- 2. Création dans auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        extensions.crypt(p_password, extensions.gen_salt('bf')),
        now(),
        NULL,
        NULL,
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
        now(),
        now(),
        '',
        '',
        '',
        ''
    )
    RETURNING id INTO v_user_id;

    -- 3. Le trigger handle_new_user devrait créer l'entrée dans public.users
    -- Mais au cas où, ou pour s'assurer des noms :
    INSERT INTO public.users (id, email, first_name, last_name, is_active, permissions)
    VALUES (v_user_id, p_email, p_first_name, p_last_name, true, p_permissions)
    ON CONFLICT (id) DO UPDATE SET 
        first_name = p_first_name, 
        last_name = p_last_name,
        is_active = true;

    -- 4. Création dans platform_admins
    INSERT INTO public.platform_admins (user_id, role, permissions, is_active)
    VALUES (v_user_id, p_role, p_permissions, true);

    RETURN v_user_id;
END;
$$;

-- Accorder les droits d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.create_platform_admin(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Commentaire de succès
SELECT 'Fonctions de gestion Admin installées avec succès' as status;
