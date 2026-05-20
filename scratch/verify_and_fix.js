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
        const gico_agency_id = '3c46c864-0e69-4a24-ab09-39302cfc9ca3';
        const gico8kilos_agency_id = 'eb3ccc80-8318-487c-89d3-ec621776b1e1';

        // DAGO (gico8kilos@gicosarl.net) was already added as 'manager' in the previous script.
        // Now check if the RLS policy for 'is_agency_member' handles 'manager' role too.
        // The policy checks is_agency_member(agency_id) which just checks if user_id exists in agency_users.
        // So manager should work fine. Let's verify DAGO is now in agency_users.

        console.log("=== DAGO current agency_users ===");
        const res = await client.query(`
            SELECT au.*, a.name as agency_name 
            FROM public.agency_users au 
            JOIN public.agencies a ON a.id = au.agency_id
            WHERE au.user_id = $1;
        `, [dago_user_id]);
        console.log(JSON.stringify(res.rows, null, 2));

        // Now check is_agency_member function - it just checks existence regardless of role
        console.log("\n=== is_agency_member function source ===");
        const resFn = await client.query(`
            SELECT prosrc FROM pg_proc WHERE proname = 'is_agency_member';
        `);
        console.log(resFn.rows[0]?.prosrc);

        // Check dashboard stats v3
        console.log("\n=== Dashboard stats functions available ===");
        const resDash = await client.query(`
            SELECT proname, proargnames FROM pg_proc 
            WHERE proname LIKE 'get_dashboard%'
            ORDER BY proname;
        `);
        console.log(JSON.stringify(resDash.rows, null, 2));

        // Check admin creation RPC
        console.log("\n=== Admin creation functions ===");
        const resAdmin = await client.query(`
            SELECT proname, proargnames, prosecdef FROM pg_proc 
            WHERE proname LIKE '%admin%' AND pronamespace = 'public'::regnamespace
            ORDER BY proname;
        `);
        console.log(JSON.stringify(resAdmin.rows, null, 2));

        // Check what platform_admins looks like
        console.log("\n=== platform_admins table ===");
        const resPlat = await client.query(`SELECT * FROM public.platform_admins LIMIT 5;`);
        console.log(JSON.stringify(resPlat.rows, null, 2));

        // Check RLS on contracts table
        console.log("\n=== RLS policies on contracts ===");
        const resPolicies = await client.query(`
            SELECT policyname, cmd, qual 
            FROM pg_policies 
            WHERE tablename = 'contracts' AND schemaname = 'public';
        `);
        console.log(JSON.stringify(resPolicies.rows, null, 2));

        // Check RLS on rent_receipts
        console.log("\n=== RLS policies on rent_receipts ===");
        const resReceipts = await client.query(`
            SELECT policyname, cmd, qual 
            FROM pg_policies 
            WHERE tablename = 'rent_receipts' AND schemaname = 'public';
        `);
        console.log(JSON.stringify(resReceipts.rows, null, 2));

        console.log("\n✅ Done!");

    } catch (err) {
        console.error("❌ Script failed:", err);
    } finally {
        await client.end();
    }
}

main();
