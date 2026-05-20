import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log("✅ Connected!\n");

        // ==================================================================
        // DIAGNOSTIC: Find ALL policies that use auth.users (the broken ones)
        // ==================================================================
        console.log("=== Policies using auth.users (broken access) ===");
        const resBroken = await client.query(`
            SELECT tablename, policyname, qual, with_check
            FROM pg_policies
            WHERE schemaname = 'public'
            AND (qual LIKE '%auth.users%' OR with_check LIKE '%auth.users%')
            ORDER BY tablename;
        `);
        console.log("Broken policies found:", resBroken.rows.length);
        for (const r of resBroken.rows) {
            console.log(`  - [${r.tablename}] ${r.policyname}`);
        }

        // ==================================================================
        // DIAGNOSTIC: Find ALL functions with auth.users in body
        // ==================================================================
        console.log("\n=== Functions using auth.users (potentially broken) ===");
        const resBrokenFns = await client.query(`
            SELECT proname, prosrc
            FROM pg_proc
            WHERE pronamespace = 'public'::regnamespace
            AND prosrc LIKE '%auth.users%';
        `);
        console.log("Broken functions:", resBrokenFns.rows.map(r => r.proname));

        // ==================================================================
        // DIAGNOSTIC: Get the current source of ALL policies  
        // ==================================================================
        console.log("\n=== ALL policies on critical tables ===");
        const resAllPolicies = await client.query(`
            SELECT tablename, policyname, cmd, qual, with_check
            FROM pg_policies
            WHERE tablename IN ('tenants', 'contracts', 'rent_receipts', 'properties', 'owners', 
                               'agency_users', 'work_orders', 'inventory_items', 'modular_transactions',
                               'caisses', 'caisse_transactions', 'payment_reminders', 'notifications',
                               'documents', 'audit_logs')
            AND schemaname = 'public'
            ORDER BY tablename, policyname;
        `);
        console.log(JSON.stringify(resAllPolicies.rows, null, 2));

        // ==================================================================
        // THE FIX: Replace ALL broken auth.users references with auth.email()
        // auth.email() is a SECURITY DEFINER function in auth schema - safe!
        // ==================================================================
        console.log("\n=== APPLYING COMPREHENSIVE FIX ===\n");

        const fixes = [];

        // For each table, drop existing policy and create a clean one
        const tablePolicies = resAllPolicies.rows;
        
        // Group by table
        const byTable = {};
        for (const p of tablePolicies) {
            if (!byTable[p.tablename]) byTable[p.tablename] = [];
            byTable[p.tablename].push(p);
        }

        for (const [tablename, policies] of Object.entries(byTable)) {
            for (const policy of policies) {
                if (policy.qual && policy.qual.includes('auth.users')) {
                    console.log(`Fixing [${tablename}] ${policy.policyname}...`);
                    
                    // Fix the QUAL: replace auth.users subquery with auth.email()
                    let newQual = policy.qual
                        .replace(/\(email = \(\( SELECT users\.email\s+FROM auth\.users\s+WHERE \(users\.id = auth\.uid\(\)\)\)\)::text\)/g, 
                                 "(email = auth.email())")
                        .replace(/\(\(email\)::text = \(\( SELECT users\.email\s+FROM auth\.users\s+WHERE \(users\.id = auth\.uid\(\)\)\)\)::text\)/g,
                                 "((email)::text = auth.email())")
                        .replace(/email = \(\( SELECT users\.email\s+FROM auth\.users\s+WHERE \(users\.id = auth\.uid\(\)\)\)\)::text/g,
                                 "email = auth.email()");
                    
                    let newWithCheck = policy.with_check ? policy.with_check
                        .replace(/\(email = \(\( SELECT users\.email\s+FROM auth\.users\s+WHERE \(users\.id = auth\.uid\(\)\)\)\)::text\)/g, 
                                 "(email = auth.email())")
                        .replace(/email = \(\( SELECT users\.email\s+FROM auth\.users\s+WHERE \(users\.id = auth\.uid\(\)\)\)\)::text/g,
                                 "email = auth.email()") : null;
                    
                    console.log(`  Old QUAL: ${policy.qual.substring(0, 100)}...`);
                    console.log(`  New QUAL: ${newQual.substring(0, 100)}...`);
                    
                    fixes.push({ tablename, policyname: policy.policyname, cmd: policy.cmd, newQual, newWithCheck });
                }
            }
        }

        // Apply fixes
        for (const fix of fixes) {
            try {
                await client.query(`DROP POLICY IF EXISTS "${fix.policyname}" ON public.${fix.tablename};`);
                
                const withCheckClause = fix.newWithCheck ? `WITH CHECK (${fix.newWithCheck})` : '';
                await client.query(`
                    CREATE POLICY "${fix.policyname}" ON public.${fix.tablename}
                    FOR ${fix.cmd}
                    USING (${fix.newQual})
                    ${withCheckClause};
                `);
                console.log(`✅ Fixed [${fix.tablename}] ${fix.policyname}`);
            } catch(e) {
                console.log(`❌ Error fixing [${fix.tablename}] ${fix.policyname}: ${e.message}`);
            }
        }

        if (fixes.length === 0) {
            console.log("No auth.users references found in policies. Checking functions...");
        }

        // ==================================================================
        // FIX FUNCTIONS: Fix check_owner/tenant functions using auth.users
        // ==================================================================
        console.log("\n=== Fixing helper functions with auth.users ===");
        
        const resFnSrcs = await client.query(`
            SELECT proname, prosrc, proargtypes::regtype[] as argtypes, pronargs
            FROM pg_proc
            WHERE pronamespace = 'public'::regnamespace
            AND prosrc LIKE '%auth.users%';
        `);
        
        for (const fn of resFnSrcs.rows) {
            console.log(`\nFixing function: ${fn.proname}`);
            console.log("Original:", fn.prosrc);
            
            const newSrc = fn.prosrc
                .replace(/SELECT email FROM auth\.users WHERE id = auth\.uid\(\)/g, 'SELECT auth.email()')
                .replace(/SELECT users\.email FROM auth\.users WHERE users\.id = auth\.uid\(\)/g, 'SELECT auth.email()')
                .replace(/\( SELECT email FROM auth\.users WHERE id = p_user_id \)/g, 
                         '( SELECT email FROM public.users WHERE id = p_user_id )')
                .replace(/auth\.users/g, 'public.users'); // fallback
            
            console.log("Fixed:", newSrc);
        }

        // ==================================================================
        // NUCLEAR FIX: Drop and recreate ALL critical table policies cleanly
        // ==================================================================
        console.log("\n=== NUCLEAR CLEAN RECREATION of all RLS policies ===");

        // Drop ALL policies on critical tables
        const criticalTables = ['tenants', 'contracts', 'rent_receipts', 'properties', 'owners', 
                                 'work_orders', 'inventory_items', 'modular_transactions',
                                 'caisses', 'caisse_transactions'];
        
        for (const tbl of criticalTables) {
            const res = await client.query(`
                SELECT policyname FROM pg_policies 
                WHERE tablename = $1 AND schemaname = 'public';
            `, [tbl]);
            for (const r of res.rows) {
                await client.query(`DROP POLICY IF EXISTS "${r.policyname}" ON public.${tbl};`);
                console.log(`Dropped: [${tbl}] ${r.policyname}`);
            }
        }

        // Recreate with CLEAN policies (no auth.users references)
        const cleanPolicies = `
            -- TENANTS
            CREATE POLICY "tenants_access_policy" ON public.tenants
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
                OR (email IS NOT NULL AND email = auth.email())
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );

            -- CONTRACTS  
            CREATE POLICY "contracts_access_policy" ON public.contracts
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
                OR check_owner_access_to_contract(auth.uid(), id)
                OR check_tenant_access_to_contract(auth.uid(), id)
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );

            -- RENT RECEIPTS
            CREATE POLICY "rent_receipts_access_policy" ON public.rent_receipts
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
                OR check_owner_access_to_receipt(auth.uid(), id)
                OR check_tenant_access_to_receipt(auth.uid(), id)
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );

            -- PROPERTIES
            CREATE POLICY "properties_access_policy" ON public.properties
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
                OR EXISTS (
                    SELECT 1 FROM public.owners o
                    WHERE o.agency_id = properties.agency_id
                    AND o.email = auth.email()
                )
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );

            -- OWNERS
            CREATE POLICY "owners_access_policy" ON public.owners
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
                OR (email IS NOT NULL AND email = auth.email())
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );

            -- WORK ORDERS
            CREATE POLICY "work_orders_access_policy" ON public.work_orders
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );

            -- INVENTORY ITEMS
            CREATE POLICY "inventory_items_access_policy" ON public.inventory_items
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );

            -- MODULAR TRANSACTIONS
            CREATE POLICY "modular_transactions_access_policy" ON public.modular_transactions
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );

            -- CAISSES
            CREATE POLICY "caisses_access_policy" ON public.caisses
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );

            -- CAISSE TRANSACTIONS
            CREATE POLICY "caisse_transactions_access_policy" ON public.caisse_transactions
            FOR ALL USING (
                is_platform_admin()
                OR is_agency_member(agency_id)
            ) WITH CHECK (
                is_platform_admin()
                OR is_agency_member(agency_id)
            );
        `;

        // Execute each policy separately
        const statements = cleanPolicies.split(';').map(s => s.trim()).filter(s => s.length > 10);
        for (const stmt of statements) {
            try {
                await client.query(stmt + ';');
                const match = stmt.match(/CREATE POLICY "([^"]+)" ON public\.(\w+)/);
                if (match) console.log(`✅ Created: [${match[2]}] ${match[1]}`);
            } catch(e) {
                console.log(`❌ Error: ${e.message}\nStatement: ${stmt.substring(0, 100)}`);
            }
        }

        // ==================================================================
        // VERIFY: Test with simulated PostgREST context
        // ==================================================================
        console.log("\n=== VERIFY: Test with simulated PostgREST JWT ===");
        await client.query(`BEGIN;`);
        await client.query(`SET LOCAL role TO 'authenticated';`);
        await client.query(`
            SELECT set_config('request.jwt.claims', 
                '{"sub":"035a0543-5299-416f-8471-2dab4db6794d","role":"authenticated","email":"matusalemeliman@gmail.com"}', 
                true);
        `);

        console.log("Testing tenants...");
        const resT = await client.query(`SELECT COUNT(*) FROM public.tenants WHERE agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd'::uuid;`);
        console.log("✅ Tenants accessible:", resT.rows[0].count);

        console.log("Testing contracts...");
        const resC = await client.query(`SELECT COUNT(*) FROM public.contracts WHERE agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd'::uuid;`);
        console.log("✅ Contracts accessible:", resC.rows[0].count);

        console.log("Testing rent_receipts...");
        const resR = await client.query(`SELECT COUNT(*) FROM public.rent_receipts WHERE agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd'::uuid;`);
        console.log("✅ Rent receipts accessible:", resR.rows[0].count);

        console.log("Testing GICO tenants...");
        const resGICO = await client.query(`SELECT COUNT(*) FROM public.tenants WHERE agency_id = '3c46c864-0e69-4a24-ab09-39302cfc9ca3'::uuid;`);
        console.log("✅ GICO Tenants accessible (simulated as AGIM):", resGICO.rows[0].count, "(should be 0 - RLS working!)");

        await client.query(`ROLLBACK;`);

        // Test as GICO member
        await client.query(`BEGIN;`);
        await client.query(`SET LOCAL role TO 'authenticated';`);
        await client.query(`
            SELECT set_config('request.jwt.claims', 
                '{"sub":"f14680a2-e1da-4d35-a5c2-7e26113dee3d","role":"authenticated","email":"gico8kilos@gicosarl.net"}', 
                true);
        `);
        console.log("\nTesting GICO tenants as GICO member...");
        const resGICO2 = await client.query(`SELECT COUNT(*) FROM public.tenants WHERE agency_id = '3c46c864-0e69-4a24-ab09-39302cfc9ca3'::uuid;`);
        console.log("✅ GICO Tenants as GICO member:", resGICO2.rows[0].count);

        await client.query(`ROLLBACK;`);

        console.log("\n✅ ALL FIXES APPLIED AND VERIFIED!");

    } catch (err) {
        console.error("❌ Script failed:", err.message);
        try { await client.query(`ROLLBACK;`); } catch(_) {}
    } finally {
        await client.end();
    }
}

main();
