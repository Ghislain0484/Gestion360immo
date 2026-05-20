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

        // 1. Find DAGO's agencies via auth.users email
        console.log("--- DAGO in auth.users ---");
        const resAuth = await client.query(`
            SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = $1;
        `, [dago_user_id]);
        console.log(JSON.stringify(resAuth.rows, null, 2));

        // 2. Find which agencies exist with that agency_id
        console.log("\n--- Agency 3c46c864 info ---");
        const resAgency = await client.query(`
            SELECT id, name, status, director_email FROM public.agencies WHERE id = $1;
        `, [agency_id_from_logs]);
        console.log(JSON.stringify(resAgency.rows, null, 2));

        // 3. Check ALL agencies DAGO might be director of
        console.log("\n--- Agencies where DAGO is director ---");
        const resDirAgency = await client.query(`
            SELECT id, name, status, director_email FROM public.agencies 
            WHERE director_email = (SELECT email FROM auth.users WHERE id = $1);
        `, [dago_user_id]);
        console.log(JSON.stringify(resDirAgency.rows, null, 2));

        // 4. Check current agency_users table
        console.log("\n--- All agency_users entries ---");
        const resAllAgencyUsers = await client.query(`
            SELECT au.*, a.name as agency_name FROM public.agency_users au
            LEFT JOIN public.agencies a ON a.id = au.agency_id
            LIMIT 20;
        `);
        console.log(JSON.stringify(resAllAgencyUsers.rows, null, 2));

        // 5. Check platform_admins table structure
        console.log("\n--- platform_admins table (first 5) ---");
        const resAdmins = await client.query(`SELECT * FROM public.platform_admins LIMIT 5;`);
        console.log(JSON.stringify(resAdmins.rows, null, 2));

        // 6. Check if create_platform_admin RPC exists
        console.log("\n--- Platform admin creation RPC exists? ---");
        const resRpc = await client.query(`
            SELECT routine_name, routine_type FROM information_schema.routines
            WHERE routine_schema = 'public' AND routine_name LIKE '%admin%'
            ORDER BY routine_name;
        `);
        console.log(JSON.stringify(resRpc.rows, null, 2));

        // 7. FIX: Insert DAGO into agency_users for both known agency IDs
        console.log("\n--- FIXING: Inserting DAGO into agency_users ---");
        
        // Insert for agency from current logs
        const res1 = await client.query(`
            INSERT INTO public.agency_users (user_id, agency_id, role)
            VALUES ($1, $2, 'director')
            ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'director'
            RETURNING *;
        `, [dago_user_id, agency_id_from_logs]);
        console.log("✅ Inserted for 3c46c864:", res1.rows);

        // Also insert for the other known agency ID from earlier logs
        const agency_id_old = 'a83b7ddd-ea8c-4cbc-81e6-3cd097087b4e';
        try {
            const res2 = await client.query(`
                INSERT INTO public.agency_users (user_id, agency_id, role)
                VALUES ($1, $2, 'director')
                ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'director'
                RETURNING *;
            `, [dago_user_id, agency_id_old]);
            console.log("✅ Inserted for a83b7ddd:", res2.rows);
        } catch(e) {
            console.log("⚠️ Could not insert for a83b7ddd (may not exist):", e.message);
        }

        // 8. Also insert for any agency DAGO is director of
        const resDirAgencies = await client.query(`
            SELECT id FROM public.agencies 
            WHERE director_email = (SELECT email FROM auth.users WHERE id = $1);
        `, [dago_user_id]);
        
        for (const row of resDirAgencies.rows) {
            if (row.id !== agency_id_from_logs && row.id !== agency_id_old) {
                try {
                    await client.query(`
                        INSERT INTO public.agency_users (user_id, agency_id, role)
                        VALUES ($1, $2, 'director')
                        ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'director';
                    `, [dago_user_id, row.id]);
                    console.log(`✅ Inserted for agency ${row.id}`);
                } catch(e) {
                    console.log(`⚠️ Could not insert for ${row.id}:`, e.message);
                }
            }
        }

        console.log("\n✅ DAGO fix complete!");

    } catch (err) {
        console.error("❌ Script failed:", err);
    } finally {
        await client.end();
    }
}

main();
