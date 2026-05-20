import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log("✅ Connected!\n");

        // ==================================================================
        // 1. Check ALL RLS policies on critical tables
        // ==================================================================
        console.log("=== ALL RLS Policies on critical tables ===");
        const resPolicies = await client.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies 
            WHERE tablename IN ('tenants', 'contracts', 'rent_receipts', 'properties', 'owners', 'agency_users')
            AND schemaname = 'public'
            ORDER BY tablename, policyname;
        `);
        for (const r of resPolicies.rows) {
            console.log(`\n[${r.tablename}] ${r.policyname} (${r.cmd}):`);
            console.log(`  USING: ${r.qual}`);
            if (r.with_check) console.log(`  WITH CHECK: ${r.with_check}`);
        }

        // ==================================================================
        // 2. Check if RLS is actually ENABLED on these tables
        // ==================================================================
        console.log("\n\n=== RLS Status ===");
        const resRLS = await client.query(`
            SELECT relname, relrowsecurity, relforcerowsecurity
            FROM pg_class
            WHERE relname IN ('tenants', 'contracts', 'rent_receipts', 'properties', 'owners', 'agency_users')
            AND relnamespace = 'public'::regnamespace
            ORDER BY relname;
        `);
        console.log(JSON.stringify(resRLS.rows, null, 2));

        // ==================================================================
        // 3. Check GRANTS on critical tables for 'authenticated' role
        // ==================================================================
        console.log("\n=== Table GRANTS for authenticated role ===");
        const resGrants = await client.query(`
            SELECT table_name, privilege_type, grantee
            FROM information_schema.table_privileges
            WHERE table_schema = 'public'
            AND table_name IN ('tenants', 'contracts', 'rent_receipts', 'properties', 'owners', 'agency_users')
            AND grantee IN ('authenticated', 'anon', 'service_role')
            ORDER BY table_name, grantee, privilege_type;
        `);
        console.log(JSON.stringify(resGrants.rows, null, 2));

        // ==================================================================
        // 4. Simulate is_agency_member for AGIM GROUP director
        // ==================================================================
        console.log("\n=== Simulate is_agency_member for AGIM GROUP ===");
        const agim_director = '035a0543-5299-416f-8471-2dab4db6794d';
        const agim_agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd';
        
        // Set auth.uid() context and test
        await client.query(`SET LOCAL role TO 'authenticated';`);
        await client.query(`SELECT set_config('request.jwt.claims', '{"sub":"${agim_director}","role":"authenticated"}', true);`);
        
        const resTest = await client.query(`SELECT is_agency_member($1::uuid) as result;`, [agim_agency_id]);
        console.log("is_agency_member result for AGIM director:", resTest.rows[0]);
        
        const resTest2 = await client.query(`SELECT auth.uid() as uid;`);
        console.log("auth.uid() in context:", resTest2.rows[0]);
        
        await client.query(`RESET role;`);

        // ==================================================================
        // 5. Check get_dashboard_stats_v3 - why 400?
        // ==================================================================
        console.log("\n=== Test get_dashboard_stats_v3 directly ===");
        try {
            const resDash = await client.query(`
                SELECT get_dashboard_stats_v3('3c46c864-0e69-4a24-ab09-39302cfc9ca3'::uuid);
            `);
            console.log("✅ Dashboard stats result:", JSON.stringify(resDash.rows[0], null, 2));
        } catch(e) {
            console.log("❌ Dashboard stats error:", e.message);
        }

        // ==================================================================
        // 6. Check function search_path and security settings
        // ==================================================================
        console.log("\n=== Function security settings ===");
        const resFns = await client.query(`
            SELECT proname, prosecdef, proconfig, pronargs
            FROM pg_proc
            WHERE proname IN ('is_agency_member', 'is_platform_admin', 'get_dashboard_stats_v3',
                             'check_owner_access_to_contract', 'check_tenant_access_to_contract',
                             'check_owner_access_to_receipt', 'check_tenant_access_to_receipt')
            AND pronamespace = 'public'::regnamespace
            ORDER BY proname;
        `);
        console.log(JSON.stringify(resFns.rows, null, 2));

        // ==================================================================
        // 7. Check if there's a conflicting DENY policy somewhere
        // ==================================================================
        console.log("\n=== Check for RESTRICTIVE policies (rare but can block access) ===");
        const resRestrictive = await client.query(`
            SELECT tablename, policyname, permissive, cmd, qual
            FROM pg_policies
            WHERE schemaname = 'public'
            AND permissive = 'RESTRICTIVE'
            ORDER BY tablename;
        `);
        console.log(JSON.stringify(resRestrictive.rows, null, 2));

        // ==================================================================
        // 8. Check tenants count for both agencies (as superuser)
        // ==================================================================
        console.log("\n=== Tenant counts (bypassing RLS) ===");
        const resCounts = await client.query(`
            SELECT agency_id, COUNT(*) as tenant_count
            FROM public.tenants
            WHERE agency_id IN ('3c46c864-0e69-4a24-ab09-39302cfc9ca3', '8561e4b6-0a47-47ba-9def-b2914885fedd')
            GROUP BY agency_id;
        `);
        console.log(JSON.stringify(resCounts.rows, null, 2));

    } catch (err) {
        console.error("❌ Script failed:", err);
    } finally {
        await client.end();
    }
}

main();
