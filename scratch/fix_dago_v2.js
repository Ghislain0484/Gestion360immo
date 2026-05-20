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
        const current_director_id = '7e1bb674-66ee-46f2-aec2-550231b660b0';

        // 1. Who is current director in auth.users?
        console.log("=== Current director info ===");
        const resDir = await client.query(`
            SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = $1;
        `, [current_director_id]);
        console.log(JSON.stringify(resDir.rows, null, 2));

        // 2. Check constraint definition
        console.log("\n=== Constraint definition ===");
        const resConstraint = await client.query(`
            SELECT conname, contype, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conname = 'uq_agency_single_director';
        `);
        console.log(JSON.stringify(resConstraint.rows, null, 2));

        // 3. The fix: Update the current director entry to be for DAGO instead
        // OR add DAGO as 'manager' since director slot is taken
        // First check if DAGO exists already in agency_users for these agencies
        console.log("\n=== DAGO current agency_users ===");
        const resDagoCheck = await client.query(`
            SELECT * FROM public.agency_users WHERE user_id = $1;
        `, [dago_user_id]);
        console.log(JSON.stringify(resDagoCheck.rows, null, 2));

        // 4. Since the agency director is 7e1bb674 but DAGO (f14680a2) needs access,
        // we'll update the existing director entry to point to DAGO OR add DAGO as manager
        // Let's check if there's a unique constraint only on director role
        console.log("\n=== Checking if we can add DAGO as manager ===");
        const res1 = await client.query(`
            INSERT INTO public.agency_users (user_id, agency_id, role)
            VALUES ($1, $2, 'manager')
            ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'manager', updated_at = NOW()
            RETURNING *;
        `, [dago_user_id, gico_agency_id]);
        console.log("✅ DAGO as manager in Général Immobilier:", res1.rows);

        const res2 = await client.query(`
            INSERT INTO public.agency_users (user_id, agency_id, role)
            VALUES ($1, $2, 'manager')
            ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'manager', updated_at = NOW()
            RETURNING *;
        `, [dago_user_id, gico8kilos_agency_id]);
        console.log("✅ DAGO as manager in GICO 8KILOS:", res2.rows);

        // 5. Also update the agencies table: set director_id to DAGO
        console.log("\n=== Updating agencies.director_id to DAGO ===");
        const res3 = await client.query(`
            UPDATE public.agencies SET director_id = $1 WHERE id = $2 RETURNING id, name, director_id;
        `, [dago_user_id, gico_agency_id]);
        console.log("✅ Updated Général Immobilier director:", res3.rows);

        // Remove old director entry and replace with DAGO as director for Général Immobilier
        console.log("\n=== Promoting DAGO to director in agency_users ===");
        
        // First update the existing director record to point to DAGO
        const res4 = await client.query(`
            UPDATE public.agency_users 
            SET user_id = $1, updated_at = NOW()
            WHERE agency_id = $2 AND role = 'director'
            RETURNING *;
        `, [dago_user_id, gico_agency_id]);
        console.log("✅ Updated director entry to DAGO in Général Immobilier:", res4.rows);

        // Remove the now-duplicate manager entry we just added
        await client.query(`
            DELETE FROM public.agency_users 
            WHERE user_id = $1 AND agency_id = $2 AND role = 'manager';
        `, [dago_user_id, gico_agency_id]);

        // For GICO 8KILOS: update the director entry
        const resCheck8k = await client.query(`
            SELECT * FROM public.agency_users WHERE agency_id = $1 AND role = 'director';
        `, [gico8kilos_agency_id]);
        console.log("GICO 8KILOS current director:", resCheck8k.rows);

        if (resCheck8k.rows.length > 0) {
            const res5 = await client.query(`
                UPDATE public.agency_users 
                SET user_id = $1, updated_at = NOW()
                WHERE agency_id = $2 AND role = 'director'
                RETURNING *;
            `, [dago_user_id, gico8kilos_agency_id]);
            console.log("✅ Updated director entry to DAGO in GICO 8KILOS:", res5.rows);
            
            // Remove duplicate manager entry
            await client.query(`
                DELETE FROM public.agency_users 
                WHERE user_id = $1 AND agency_id = $2 AND role = 'manager';
            `, [dago_user_id, gico8kilos_agency_id]);
        }

        // Update agencies.director_id for GICO 8KILOS too
        await client.query(`
            UPDATE public.agencies SET director_id = $1 WHERE id = $2;
        `, [dago_user_id, gico8kilos_agency_id]);
        console.log("✅ Updated GICO 8KILOS director_id");

        // 6. Check dashboard stats function
        console.log("\n=== Dashboard stats functions ===");
        const resDashFns = await client.query(`
            SELECT proname FROM pg_proc 
            WHERE proname LIKE '%dashboard%' OR proname LIKE '%stats%'
            AND pronamespace = 'public'::regnamespace
            ORDER BY proname;
        `);
        console.log(resDashFns.rows.map(r => r.proname));

        // 7. Check get_dashboard_stats_v3 specifically
        const resV3 = await client.query(`
            SELECT proname, proargnames, prosrc FROM pg_proc 
            WHERE proname = 'get_dashboard_stats_v3';
        `);
        if (resV3.rows.length > 0) {
            console.log("\n✅ get_dashboard_stats_v3 exists, args:", resV3.rows[0].proargnames);
        } else {
            console.log("\n❌ get_dashboard_stats_v3 NOT FOUND!");
            const resAnyStats = await client.query(`
                SELECT proname FROM pg_proc 
                WHERE proname LIKE 'get_dashboard%';
            `);
            console.log("Available get_dashboard functions:", resAnyStats.rows.map(r => r.proname));
        }

        // 8. Final verification
        console.log("\n=== FINAL: DAGO agency access verification ===");
        const resFinal = await client.query(`
            SELECT au.user_id, au.agency_id, au.role, a.name as agency_name
            FROM public.agency_users au
            JOIN public.agencies a ON a.id = au.agency_id
            WHERE au.user_id = $1;
        `, [dago_user_id]);
        console.log(JSON.stringify(resFinal.rows, null, 2));

        console.log("\n✅ All fixes applied!");

    } catch (err) {
        console.error("❌ Fix failed:", err);
    } finally {
        await client.end();
    }
}

main();
