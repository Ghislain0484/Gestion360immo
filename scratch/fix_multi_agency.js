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

        // 1. Remove DAGO from GICO 8KILOS - he should only be in Général Immobilier
        // GICO 8KILOS (eb3ccc80) already has jeanpauldago@gicosarl.net as director
        // gico8kilos@gicosarl.net is a separate account that shouldn't be in GICO 8KILOS
        const dago_user_id = 'f14680a2-e1da-4d35-a5c2-7e26113dee3d';
        const gico8kilos_id = 'eb3ccc80-8318-487c-89d3-ec621776b1e1';
        const general_immo_id = '3c46c864-0e69-4a24-ab09-39302cfc9ca3';
        
        console.log("=== Removing gico8kilos from GICO 8KILOS (wrong agency) ===");
        const resRemove = await client.query(`
            DELETE FROM public.agency_users 
            WHERE user_id = $1 AND agency_id = $2
            RETURNING *;
        `, [dago_user_id, gico8kilos_id]);
        console.log("✅ Removed:", resRemove.rows);

        // 2. Verify DAGO now has only one agency
        console.log("\n=== DAGO agencies after fix ===");
        const resDago = await client.query(`
            SELECT au.user_id, au.role, a.name as agency_name, u.email
            FROM public.agency_users au
            JOIN public.agencies a ON a.id = au.agency_id
            JOIN auth.users u ON u.id = au.user_id
            WHERE au.user_id = $1;
        `, [dago_user_id]);
        console.log(JSON.stringify(resDago.rows, null, 2));

        // 3. Clean up the test admin user created during testing
        console.log("\n=== Cleanup test admin user ===");
        const testUserId = '3ea0c573-fd04-4706-a072-18b87330c426';
        
        // Remove from platform_admins if there
        await client.query(`DELETE FROM public.platform_admins WHERE user_id = $1;`, [testUserId]);
        await client.query(`DELETE FROM public.users WHERE id = $1;`, [testUserId]);
        await client.query(`DELETE FROM auth.users WHERE id = $1;`, [testUserId]);
        console.log("✅ Test admin cleaned up");

        // 4. Check all users who have multi-agency access (could cause AgencyPicker to show)
        console.log("\n=== Users with multiple agencies (will see AgencyPicker) ===");
        const resMulti = await client.query(`
            SELECT au.user_id, u.email, COUNT(*) as agency_count, 
                   array_agg(a.name) as agencies
            FROM public.agency_users au
            JOIN auth.users u ON u.id = au.user_id
            JOIN public.agencies a ON a.id = au.agency_id
            GROUP BY au.user_id, u.email
            HAVING COUNT(*) > 1
            ORDER BY agency_count DESC;
        `);
        console.log("Multi-agency users:", JSON.stringify(resMulti.rows, null, 2));

        // 5. Verify jeanpauldago@gicosarl.net agencies (he SHOULD have both GICO agencies)
        const jpdago_id = '7e1bb674-66ee-46f2-aec2-550231b660b0';
        console.log("\n=== jeanpauldago agencies (director of both GICO branches) ===");
        const resJP = await client.query(`
            SELECT au.role, a.name 
            FROM public.agency_users au
            JOIN public.agencies a ON a.id = au.agency_id
            WHERE au.user_id = $1;
        `, [jpdago_id]);
        console.log(JSON.stringify(resJP.rows, null, 2));

        console.log("\n✅ All fixes done!");

    } catch (err) {
        console.error("❌ Script failed:", err);
    } finally {
        await client.end();
    }
}

main();
