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

        const dago_user_id = 'f14680a2-e1da-4d35-a5c2-7e26113dee3d';
        // Agency 3c46c864 = "Général Immobilier et Conseils SARL" (GICO) where DAGO logs show access
        // Agency eb3ccc80 = "GICO 8KILOS" (same group, different branch)
        const gico_agency_id = '3c46c864-0e69-4a24-ab09-39302cfc9ca3';  // Général Immobilier et Conseils SARL
        const gico8kilos_agency_id = 'eb3ccc80-8318-487c-89d3-ec621776b1e1';  // GICO 8KILOS

        console.log("=== FIX 1: Insert DAGO into agency_users for both GICO agencies ===\n");

        // Insert DAGO as director for Général Immobilier et Conseils SARL
        const res1 = await client.query(`
            INSERT INTO public.agency_users (user_id, agency_id, role)
            VALUES ($1, $2, 'director')
            ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'director', updated_at = NOW()
            RETURNING *;
        `, [dago_user_id, gico_agency_id]);
        console.log("✅ DAGO inserted/updated in Général Immobilier et Conseils SARL:", res1.rows);

        // Insert DAGO as director for GICO 8KILOS too
        const res2 = await client.query(`
            INSERT INTO public.agency_users (user_id, agency_id, role)
            VALUES ($1, $2, 'director')
            ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'director', updated_at = NOW()
            RETURNING *;
        `, [dago_user_id, gico8kilos_agency_id]);
        console.log("✅ DAGO inserted/updated in GICO 8KILOS:", res2.rows);

        console.log("\n=== FIX 2: Fix the handle_new_user trigger to auto-add directors to agency_users ===\n");

        // Check the handle_new_user trigger function
        const resTrigger = await client.query(`
            SELECT prosrc FROM pg_proc 
            WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace;
        `);
        if (resTrigger.rows.length > 0) {
            console.log("handle_new_user function exists. First 500 chars:");
            console.log(resTrigger.rows[0].prosrc.substring(0, 500));
        } else {
            console.log("⚠️ handle_new_user function not found in public schema");
            // Check auth schema
            const resTriggerAuth = await client.query(`
                SELECT prosrc FROM pg_proc 
                WHERE proname = 'handle_new_user';
            `);
            if (resTriggerAuth.rows.length > 0) {
                console.log("Found in other schema. First 500 chars:");
                console.log(resTriggerAuth.rows[0].prosrc.substring(0, 500));
            }
        }

        console.log("\n=== FIX 3: Check/fix create_platform_admin RPC ===\n");

        // Check the create_platform_admin function
        const resAdminRpc = await client.query(`
            SELECT proname, prosecdef, prosrc FROM pg_proc 
            WHERE proname IN ('create_platform_admin', 'create_admin_user', 'add_platform_admin')
            AND pronamespace = 'public'::regnamespace;
        `);
        console.log("Admin RPC functions found:", resAdminRpc.rows.map(r => r.proname));
        if (resAdminRpc.rows.length > 0) {
            console.log("\nFunction source (first 600 chars):");
            console.log(resAdminRpc.rows[0].prosrc.substring(0, 600));
        }

        console.log("\n=== FIX 4: Check get_dashboard_stats_v3 function (400 error) ===\n");

        const resDash = await client.query(`
            SELECT proname, prosrc FROM pg_proc 
            WHERE proname = 'get_dashboard_stats_v3' AND pronamespace = 'public'::regnamespace;
        `);
        if (resDash.rows.length > 0) {
            console.log("✅ get_dashboard_stats_v3 exists. First 300 chars:");
            console.log(resDash.rows[0].prosrc.substring(0, 300));
        } else {
            console.log("❌ get_dashboard_stats_v3 does NOT exist!");
            // Check what dashboard stats functions exist
            const resAllDash = await client.query(`
                SELECT proname FROM pg_proc 
                WHERE proname LIKE '%dashboard%' AND pronamespace = 'public'::regnamespace;
            `);
            console.log("Available dashboard functions:", resAllDash.rows.map(r => r.proname));
        }

        console.log("\n=== VERIFICATION: DAGO now has agency access ===\n");
        const resVerify = await client.query(`
            SELECT au.*, a.name as agency_name FROM public.agency_users au
            LEFT JOIN public.agencies a ON a.id = au.agency_id
            WHERE au.user_id = $1;
        `, [dago_user_id]);
        console.log("DAGO agency_users entries:", JSON.stringify(resVerify.rows, null, 2));

    } catch (err) {
        console.error("❌ Fix failed:", err);
    } finally {
        await client.end();
    }
}

main();
