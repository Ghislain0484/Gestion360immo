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
        const agency_id_from_logs = '3c46c864-0e69-4a24-ab09-39302cfc9ca3';

        // 1. Check agencies table columns
        console.log("--- agencies table columns ---");
        const resCols = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agencies'
            ORDER BY ordinal_position;
        `);
        console.log(resCols.rows.map(r => r.column_name + ' (' + r.data_type + ')').join('\n'));

        // 2. Check agency_users columns
        console.log("\n--- agency_users table columns ---");
        const resAuCols = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agency_users'
            ORDER BY ordinal_position;
        `);
        console.log(resAuCols.rows.map(r => r.column_name + ' (' + r.data_type + ')').join('\n'));

        // 3. Check agency 3c46c864 info
        console.log("\n--- Agency 3c46c864 info ---");
        const resAgency = await client.query(`
            SELECT * FROM public.agencies WHERE id = $1;
        `, [agency_id_from_logs]);
        console.log(JSON.stringify(resAgency.rows, null, 2));

        // 4. Check all existing agency_users
        console.log("\n--- All agency_users ---");
        const resAllAU = await client.query(`SELECT * FROM public.agency_users LIMIT 20;`);
        console.log(JSON.stringify(resAllAU.rows, null, 2));

        // 5. Check all agencies
        console.log("\n--- All agencies ---");
        const resAllAgencies = await client.query(`SELECT id, name, status FROM public.agencies LIMIT 10;`);
        console.log(JSON.stringify(resAllAgencies.rows, null, 2));

        // 6. Check RLS policies currently active on tenants/contracts
        console.log("\n--- RLS policies on tenants ---");
        const resPolicies = await client.query(`
            SELECT policyname, cmd, qual 
            FROM pg_policies 
            WHERE tablename = 'tenants' AND schemaname = 'public';
        `);
        console.log(JSON.stringify(resPolicies.rows, null, 2));

        // 7. Check if is_agency_member function exists
        console.log("\n--- is_agency_member function ---");
        const resFn = await client.query(`
            SELECT proname, prosecdef, prosrc 
            FROM pg_proc 
            WHERE proname = 'is_agency_member' AND pronamespace = 'public'::regnamespace;
        `);
        console.log(JSON.stringify(resFn.rows, null, 2));

    } catch (err) {
        console.error("❌ Script failed:", err);
    } finally {
        await client.end();
    }
}

main();
