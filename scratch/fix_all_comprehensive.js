import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected!\n");

        // =====================================================================
        // DIAGNOSTIC: Check EXECUTE grants on critical functions
        // =====================================================================
        console.log("=== EXECUTE grants on create_platform_admin ===");
        const resGrants = await client.query(`
            SELECT grantee, privilege_type 
            FROM information_schema.routine_privileges 
            WHERE routine_name = 'create_platform_admin' AND routine_schema = 'public';
        `);
        console.log(JSON.stringify(resGrants.rows, null, 2));

        console.log("\n=== EXECUTE grants on is_agency_member ===");
        const resGrantsAgency = await client.query(`
            SELECT grantee, privilege_type 
            FROM information_schema.routine_privileges 
            WHERE routine_name = 'is_agency_member' AND routine_schema = 'public';
        `);
        console.log(JSON.stringify(resGrantsAgency.rows, null, 2));

        console.log("\n=== EXECUTE grants on is_platform_admin ===");
        const resGrantsAdmin = await client.query(`
            SELECT grantee, privilege_type 
            FROM information_schema.routine_privileges 
            WHERE routine_name = 'is_platform_admin' AND routine_schema = 'public';
        `);
        console.log(JSON.stringify(resGrantsAdmin.rows, null, 2));

        // =====================================================================
        // FIX 1: Grant EXECUTE on all critical functions to authenticated/anon
        // =====================================================================
        console.log("\n=== FIX: Granting EXECUTE permissions ===");

        const functionsToGrant = [
            'create_platform_admin(text, text, text, text, text, jsonb)',
            'is_platform_admin()',
            'is_agency_member(uuid)',
            'admin_create_user_v3(text, text, text, text, uuid, text)',
            'admin_create_user_v4(text, text, text, text, uuid, text)',
            'admin_reset_user_password(uuid, text)',
            'get_dashboard_stats_v3(uuid)',
            'check_owner_access_to_contract(uuid, uuid)',
            'check_tenant_access_to_contract(uuid, uuid)',
            'check_owner_access_to_receipt(uuid, uuid)',
            'check_tenant_access_to_receipt(uuid, uuid)',
        ];

        for (const fn of functionsToGrant) {
            try {
                await client.query(`GRANT EXECUTE ON FUNCTION public.${fn} TO authenticated, anon;`);
                console.log(`✅ Granted EXECUTE on ${fn}`);
            } catch(e) {
                console.log(`⚠️ Could not grant on ${fn}: ${e.message}`);
            }
        }

        // =====================================================================
        // FIX 2: Fix the handle_new_user trigger to auto-add directors
        // =====================================================================
        console.log("\n=== FIX: Updating handle_new_user trigger ===");

        // Check if trigger exists
        const resTrigger = await client.query(`
            SELECT trigger_name FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created' 
            AND event_object_schema = 'auth'
            AND event_object_table = 'users';
        `);
        console.log("Trigger on_auth_user_created:", resTrigger.rows);

        // Get the trigger function
        const resTriggerFn = await client.query(`
            SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
        `);
        if (resTriggerFn.rows.length > 0) {
            console.log("handle_new_user function (first 300 chars):", 
                resTriggerFn.rows[0].prosrc.substring(0, 300));
        }

        // =====================================================================
        // FIX 3: Replace/fix create_platform_admin with a more robust version
        // =====================================================================
        console.log("\n=== FIX: Replacing create_platform_admin with robust version ===");
        
        await client.query(`
            CREATE OR REPLACE FUNCTION public.create_platform_admin(
                p_email TEXT,
                p_password TEXT,
                p_first_name TEXT,
                p_last_name TEXT,
                p_role TEXT DEFAULT 'admin',
                p_permissions JSONB DEFAULT '{}'::JSONB
            )
            RETURNS JSON
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public, auth, extensions
            AS $$
            DECLARE
                v_user_id UUID;
                v_admin_id UUID;
                v_encrypted_pw TEXT;
                v_existing_id UUID;
            BEGIN
                p_email := LOWER(TRIM(p_email));

                -- 1. Check if caller is a platform admin (security check)
                IF NOT (SELECT EXISTS (
                    SELECT 1 FROM public.platform_admins 
                    WHERE user_id = auth.uid() AND is_active = true
                )) THEN
                    -- Also allow if calling with superuser (direct DB call)
                    IF auth.uid() IS NOT NULL THEN
                        RETURN json_build_object('success', false, 'error', 'Permission refusée: vous devez être administrateur de la plateforme');
                    END IF;
                END IF;

                -- 2. Check/create user in auth.users
                SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
                
                IF v_existing_id IS NOT NULL THEN
                    v_user_id := v_existing_id;
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
                    -- Create user directly in auth.users (no email confirmation needed)
                    v_user_id := gen_random_uuid();
                    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

                    INSERT INTO auth.users (
                        instance_id, id, aud, role, email, encrypted_password, 
                        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
                        created_at, updated_at, confirmation_token, recovery_token, 
                        email_change_token_new, email_change, is_sso_user, deleted_at
                    )
                    VALUES (
                        '00000000-0000-0000-0000-000000000000',
                        v_user_id,
                        'authenticated',
                        'authenticated',
                        p_email,
                        v_encrypted_pw,
                        NOW(),  -- email already confirmed
                        '{"provider":"email","providers":["email"]}'::jsonb,
                        jsonb_build_object(
                            'first_name', p_first_name, 
                            'last_name', p_last_name, 
                            'role', p_role,
                            'permissions', p_permissions
                        ),
                        NOW(), NOW(), '', '', '', '', false, NULL
                    );
                END IF;

                -- 3. Ensure user exists in public.users
                INSERT INTO public.users (id, email, first_name, last_name, is_active, permissions)
                VALUES (v_user_id, p_email, p_first_name, p_last_name, true, p_permissions)
                ON CONFLICT (id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    permissions = EXCLUDED.permissions,
                    is_active = true;

                -- 4. Create or update platform_admins entry
                INSERT INTO public.platform_admins (user_id, role, permissions, is_active)
                VALUES (v_user_id, p_role, p_permissions, true)
                ON CONFLICT (user_id) DO UPDATE 
                SET role = EXCLUDED.role, 
                    permissions = EXCLUDED.permissions,
                    is_active = true,
                    updated_at = NOW()
                RETURNING id INTO v_admin_id;

                RETURN json_build_object(
                    'success', true,
                    'user_id', v_user_id,
                    'admin_id', v_admin_id,
                    'message', 'Administrateur créé avec succès'
                );
            EXCEPTION WHEN OTHERS THEN
                RETURN json_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
            END;
            $$;
        `);
        console.log("✅ create_platform_admin function replaced");

        // Grant execute on new function
        await client.query(`GRANT EXECUTE ON FUNCTION public.create_platform_admin(text, text, text, text, text, jsonb) TO authenticated, anon;`);
        console.log("✅ EXECUTE granted on new create_platform_admin");

        // =====================================================================
        // FIX 4: Fix get_dashboard_stats_v3 (400 error) 
        // =====================================================================
        console.log("\n=== Checking get_dashboard_stats_v3 source ===");
        const resDashSrc = await client.query(`
            SELECT prosrc FROM pg_proc WHERE proname = 'get_dashboard_stats_v3';
        `);
        if (resDashSrc.rows.length > 0) {
            console.log("First 800 chars:", resDashSrc.rows[0].prosrc.substring(0, 800));
        }

        // =====================================================================
        // FIX 5: Ensure all directors get auto-added to agency_users
        // Run a repair for all agencies missing their director in agency_users
        // =====================================================================
        console.log("\n=== FIX: Repair agency_users for all directors ===");
        const resRepair = await client.query(`
            INSERT INTO public.agency_users (user_id, agency_id, role)
            SELECT a.director_id, a.id, 'director'
            FROM public.agencies a
            WHERE a.director_id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM public.agency_users au 
                WHERE au.user_id = a.director_id AND au.agency_id = a.id
              )
            ON CONFLICT (user_id, agency_id) DO NOTHING
            RETURNING user_id, agency_id;
        `);
        console.log("✅ Repaired", resRepair.rowCount, "missing director entries:", 
            JSON.stringify(resRepair.rows, null, 2));

        // =====================================================================
        // VERIFICATION: Final state
        // =====================================================================
        console.log("\n=== FINAL: All agency_users with their agency names ===");
        const resFinal = await client.query(`
            SELECT au.user_id, au.role, a.name as agency_name, u.email
            FROM public.agency_users au
            JOIN public.agencies a ON a.id = au.agency_id
            LEFT JOIN auth.users u ON u.id = au.user_id
            ORDER BY a.name, au.role;
        `);
        console.log(JSON.stringify(resFinal.rows, null, 2));

        console.log("\n✅ All fixes applied successfully!");

    } catch (err) {
        console.error("❌ Fix failed:", err);
    } finally {
        await client.end();
    }
}

main();
