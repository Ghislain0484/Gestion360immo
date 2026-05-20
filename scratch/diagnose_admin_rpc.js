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

        // 1. Get full source of create_platform_admin
        console.log("=== create_platform_admin source ===");
        const resRpc = await client.query(`
            SELECT prosrc, prorettype::regtype as return_type, prosecdef
            FROM pg_proc 
            WHERE proname = 'create_platform_admin' AND pronamespace = 'public'::regnamespace;
        `);
        if (resRpc.rows.length > 0) {
            console.log("Return type:", resRpc.rows[0].return_type);
            console.log("Security definer:", resRpc.rows[0].prosecdef);
            console.log("Source:\n", resRpc.rows[0].prosrc);
        } else {
            console.log("❌ Function not found!");
        }

        // 2. Check view_platform_admins view
        console.log("\n=== view_platform_admins ===");
        const resView = await client.query(`
            SELECT definition FROM pg_views WHERE viewname = 'view_platform_admins' AND schemaname = 'public';
        `);
        if (resView.rows.length > 0) {
            console.log(resView.rows[0].definition);
        } else {
            console.log("❌ View not found!");
        }

        // 3. Check RLS on platform_admins
        console.log("\n=== RLS policies on platform_admins ===");
        const resPolicies = await client.query(`
            SELECT policyname, cmd, qual, with_check FROM pg_policies 
            WHERE tablename = 'platform_admins' AND schemaname = 'public';
        `);
        console.log(JSON.stringify(resPolicies.rows, null, 2));

        // 4. Check if auth.admin_create_user is callable
        console.log("\n=== Check auth schema functions ===");
        const resAuthFns = await client.query(`
            SELECT proname FROM pg_proc 
            WHERE pronamespace = 'auth'::regnamespace
            AND proname LIKE '%user%'
            ORDER BY proname;
        `);
        console.log(resAuthFns.rows.map(r => r.proname));

        // 5. Test creating admin directly to understand the error
        console.log("\n=== Test create_platform_admin RPC ===");
        try {
            const resTest = await client.query(`
                SELECT public.create_platform_admin(
                    'test_admin_check@gestion360.com',
                    'TestPass@123',
                    'Test',
                    'Admin',
                    'admin',
                    '{"agencies": true}'::jsonb
                );
            `);
            console.log("✅ RPC works! Result:", resTest.rows[0]);
            
            // Clean up test admin
            await client.query(`
                DELETE FROM auth.users WHERE email = 'test_admin_check@gestion360.com';
            `);
            console.log("✅ Test admin cleaned up");
        } catch(e) {
            console.log("❌ RPC failed:", e.message);
        }

    } catch (err) {
        console.error("❌ Script failed:", err);
    } finally {
        await client.end();
    }
}

main();
