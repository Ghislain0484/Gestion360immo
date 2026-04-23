-- =============================================================================
-- GESTION360 - RÉSOLUTION CONFLIT CREDENTIALS ADMIN
-- Ce script résout l'erreur de duplication d'email (23505) en :
-- 1. Supprimant le compte qui utilise déjà l'email cible
-- 2. Mettant à jour le compte Admin principal avec cet email et un nouveau MDP
-- =============================================================================

DO $$
DECLARE
    v_admin_id UUID := '05fa0469-414f-45b6-b9c3-991556276800'; -- ID de l'Admin principal
    v_conflict_id UUID;
    v_target_email TEXT := 'goldsalem97@gmail.com';
    v_new_password TEXT := 'VOTRE_NOUVEAU_MOT_DE_PASSE'; -- <--- MODIFIEZ CECI
BEGIN
    -- 1. Identifier le compte qui bloque (Mau Relle dans la capture)
    SELECT id INTO v_conflict_id FROM auth.users WHERE LOWER(email) = LOWER(v_target_email);

    -- 2. Si un conflit existe, on libère l'email
    IF v_conflict_id IS NOT NULL AND v_conflict_id <> v_admin_id THEN
        RAISE NOTICE 'Libération de l''email : Suppression du compte conflictuel (ID: %)', v_conflict_id;
        DELETE FROM auth.users WHERE id = v_conflict_id;
    END IF;

    -- 3. Mise à jour de l'Admin dans auth.users
    -- Note: auth.users gère l'authentification réelle
    UPDATE auth.users 
    SET 
        email = v_target_email,
        encrypted_password = extensions.crypt(v_new_password, extensions.gen_salt('bf')),
        email_confirmed_at = now(),
        updated_at = now(),
        raw_app_meta_data = raw_app_meta_data || '{"is_super_admin": true}'::jsonb
    WHERE id = v_admin_id;

    -- 4. Mise à jour de l'Admin dans public.users
    -- Note: public.users gère le profil affiché dans l'app
    UPDATE public.users 
    SET 
        email = v_target_email,
        first_name = 'Admin',
        last_name = 'Gestion360',
        is_active = true,
        updated_at = now()
    WHERE id = v_admin_id;

    -- 5. S'assurer qu'il est dans platform_admins si nécessaire
    INSERT INTO public.platform_admins (user_id, role, is_active)
    VALUES (v_admin_id, 'super_admin', true)
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', is_active = true;

    RAISE NOTICE '✅ Succès : L''admin utilise maintenant %', v_target_email;
END $$;

-- Pour vérifier après exécution :
-- SELECT id, email, first_name FROM public.users WHERE email = 'goldsalem97@gmail.com';
