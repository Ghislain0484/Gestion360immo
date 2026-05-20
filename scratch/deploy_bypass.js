import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    console.log("🚀 [Bypass Deploy] Connecting to database...");
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase standard connections
    });

    try {
        await client.connect();
        console.log("✅ [Bypass Deploy] Connected successfully!");

        console.log("📡 [Bypass Deploy] Deploying bypass_signup_v1...");
        await client.query(`
            CREATE OR REPLACE FUNCTION public.bypass_signup_v1(
                p_email TEXT,
                p_password TEXT,
                p_metadata JSONB
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
                    -- Retourner un indicateur d'échec propre
                    RETURN jsonb_build_object(
                        'success', false,
                        'error', 'Cet email est déjà utilisé'
                    );
                END IF;

                -- 3. Création du nouvel utilisateur
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
                    p_metadata,
                    NOW(), NOW(), '', '', '', ''
                );

                -- Les triggers s'occupent d'insérer dans public.users et de lier à public.owners automatiquement !

                RETURN jsonb_build_object(
                    'success', true,
                    'user', jsonb_build_object(
                        'id', v_user_id,
                        'email', p_email
                    )
                );

            EXCEPTION WHEN OTHERS THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', SQLERRM,
                    'detail', SQLSTATE
                );
            END;
            $$;

            -- Accorder les privilèges
            GRANT EXECUTE ON FUNCTION public.bypass_signup_v1(TEXT, TEXT, JSONB) TO anon;
            GRANT EXECUTE ON FUNCTION public.bypass_signup_v1(TEXT, TEXT, JSONB) TO authenticated;
        `);
        console.log("✅ [Bypass Deploy] bypass_signup_v1 deployed successfully!");

        console.log("📡 [Bypass Deploy] Redefining create_platform_admin with bypass credentials support...");
        await client.query(`
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
                v_encrypted_pw TEXT;
                v_existing_id UUID;
            BEGIN
                p_email := LOWER(TRIM(p_email));

                -- 1. Vérifier si l'utilisateur existe déjà dans auth.users
                SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
                
                IF v_existing_id IS NOT NULL THEN
                    v_user_id := v_existing_id;
                    
                    -- Mettre à jour les métadonnées dans auth.users
                    UPDATE auth.users 
                    SET raw_user_meta_data = jsonb_build_object(
                        'first_name', p_first_name,
                        'last_name', p_last_name,
                        'role', p_role,
                        'permissions', p_permissions
                    ),
                    updated_at = NOW()
                    WHERE id = v_user_id;
                ELSE
                    -- Créer l'utilisateur dans auth.users
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
                        jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role, 'permissions', p_permissions),
                        NOW(), NOW(), '', '', '', ''
                    );
                END IF;

                -- 2. S'assurer qu'il existe dans public.users
                INSERT INTO public.users (id, email, first_name, last_name, is_active, permissions)
                VALUES (v_user_id, p_email, p_first_name, p_last_name, true, p_permissions)
                ON CONFLICT (id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    permissions = EXCLUDED.permissions,
                    is_active = true;

                -- 3. Créer ou mettre à jour l'entrée dans platform_admins
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

            GRANT EXECUTE ON FUNCTION public.create_platform_admin(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
            GRANT EXECUTE ON FUNCTION public.create_platform_admin(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
        `);
        console.log("✅ [Bypass Deploy] create_platform_admin redefined successfully!");

        console.log("🏁 [Bypass Deploy] All database changes applied successfully!");
    } catch (err) {
        console.error("❌ [Bypass Deploy] Deployment failed:", err);
    } finally {
        await client.end();
        console.log("🔌 [Bypass Deploy] Database connection closed.");
    }
}

main();
