-- =============================================================================
-- GESTION360 - FIX CRÉATION UTILISATEUR ROBUSTE (V4)
-- Gère les doublons d'emails, la synchronisation Auth/Public et les rôles
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_user_v4(
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_agency_id UUID,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_existing_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    -- 1. Nettoyage de l'email
    p_email := LOWER(TRIM(p_email));

    -- 2. Vérifier si l'utilisateur existe déjà dans auth.users
    SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;

    IF v_existing_id IS NOT NULL THEN
        -- L'utilisateur existe déjà globalement, on va juste le mettre à jour et le lier
        v_user_id := v_existing_id;
        
        -- Mise à jour des métadonnées dans auth.users
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_build_object(
            'first_name', p_first_name,
            'last_name', p_last_name,
            'role', p_role
        ),
        updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        -- L'utilisateur n'existe pas, on le crée de zéro
        v_user_id := gen_random_uuid();
        v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, 
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
            created_at, updated_at, confirmation_token, recovery_token, 
            email_change_token_new, email_change
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            p_email,
            v_encrypted_pw,
            NOW(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role),
            NOW(), NOW(), '', '', '', ''
        );
    END IF;

    -- 3. S'assurer qu'il existe dans public.users
    INSERT INTO public.users (id, email, first_name, last_name, is_active)
    VALUES (v_user_id, p_email, p_first_name, p_last_name, true)
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        is_active = true;

    -- 4. Liaison à l'agence (agency_users)
    INSERT INTO public.agency_users (agency_id, user_id, role)
    VALUES (p_agency_id, v_user_id, p_role::public.agency_user_role)
    ON CONFLICT (agency_id, user_id) DO UPDATE SET
        role = EXCLUDED.role;

    -- 5. Succès
    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'message', CASE WHEN v_existing_id IS NOT NULL THEN 'Utilisateur existant lié avec succès' ELSE 'Nouvel utilisateur créé avec succès' END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Accorder les droits d'exécution
GRANT EXECUTE ON FUNCTION public.admin_create_user_v4(TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user_v4(TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;
