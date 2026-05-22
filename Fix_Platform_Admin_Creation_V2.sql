-- ==============================================================================
-- GESTION DES ADMINISTRATEURS PLATEFORME V2 (Standard & Super Admin)
-- Résout les problèmes de connexion des admins limités en créant les entrées
-- correspondantes dans auth.users de Supabase.
-- ==============================================================================

-- Supprimer l'ancienne version pour éviter l'erreur de signature de type
DROP FUNCTION IF EXISTS public.create_platform_admin(text,text,text,text,text,jsonb);

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
    -- 1. Vérification de sécurité : seul un super_admin peut créer un autre administrateur
    -- Note : On autorise le premier administrateur s'il n'en existe aucun dans la table.
    IF EXISTS (SELECT 1 FROM public.platform_admins) AND NOT EXISTS (
        SELECT 1 FROM public.platform_admins 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Non autorisé : Seul un Super Admin peut créer d''autres administrateurs.';
    END IF;

    -- 2. Nettoyage des orphelins (si l'utilisateur existe dans public.users mais pas dans auth.users)
    -- Cela permet de recréer proprement un compte limité défaillant avec le même email.
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        DELETE FROM public.platform_admins WHERE user_id IN (SELECT id FROM public.users WHERE email = p_email);
        DELETE FROM public.users WHERE email = p_email;
    END IF;

    -- 3. Vérification ou création de l'utilisateur dans auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        -- Insertion dans auth.users avec hachage du mot de passe
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
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
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
            now(),
            now(),
            '',
            '',
            '',
            ''
        )
        RETURNING id INTO v_user_id;
    ELSE
        -- Mise à jour du mot de passe et des métadonnées si l'utilisateur existe déjà dans auth.users
        UPDATE auth.users 
        SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
            raw_user_meta_data = raw_user_meta_data || jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
            updated_at = now()
        WHERE id = v_user_id;
    END IF;

    -- 4. Assurer la présence dans public.users (normalement géré par le trigger, mais forcé ici pour sécurité)
    INSERT INTO public.users (id, email, first_name, last_name, is_active, permissions)
    VALUES (v_user_id, p_email, p_first_name, p_last_name, true, p_permissions)
    ON CONFLICT (id) DO UPDATE SET 
        first_name = p_first_name, 
        last_name = p_last_name,
        is_active = true;

    -- 5. Créer ou mettre à jour dans platform_admins
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
