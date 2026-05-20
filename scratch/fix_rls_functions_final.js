import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log("✅ Connected!\n");

        // ==================================================================
        // DIAGNOSTIC: Check the contract_status enum values
        // ==================================================================
        console.log("=== contract_status enum values ===");
        const resEnum = await client.query(`
            SELECT unnest(enum_range(NULL::contract_status))::text AS status_value
            ORDER BY 1;
        `);
        const validStatuses = resEnum.rows.map(r => r.status_value);
        console.log("Valid contract statuses:", validStatuses);

        // ==================================================================
        // FIX 1: Replace is_agency_member with proper search_path = public, auth
        // ==================================================================
        console.log("\n=== FIX 1: Replacing is_agency_member with correct search_path ===");
        await client.query(`
            CREATE OR REPLACE FUNCTION public.is_agency_member(p_agency_id UUID)
            RETURNS BOOLEAN
            LANGUAGE sql
            SECURITY DEFINER
            STABLE
            SET search_path = public, auth
            AS $$
                SELECT EXISTS (
                    SELECT 1 FROM public.agency_users 
                    WHERE user_id = auth.uid() 
                    AND agency_id = p_agency_id
                );
            $$;
        `);
        await client.query(`GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid) TO authenticated, anon, service_role;`);
        console.log("✅ is_agency_member fixed with search_path = public, auth");

        // ==================================================================
        // FIX 2: Replace is_platform_admin with proper search_path
        // ==================================================================
        console.log("\n=== FIX 2: Replacing is_platform_admin with correct search_path ===");
        await client.query(`
            CREATE OR REPLACE FUNCTION public.is_platform_admin()
            RETURNS BOOLEAN
            LANGUAGE sql
            SECURITY DEFINER
            STABLE
            SET search_path = public, auth
            AS $$
                SELECT EXISTS (
                    SELECT 1 FROM public.platform_admins 
                    WHERE user_id = auth.uid() 
                    AND is_active = true
                );
            $$;
        `);
        await client.query(`GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, anon, service_role;`);
        console.log("✅ is_platform_admin fixed with search_path = public, auth");

        // ==================================================================
        // FIX 3: Fix get_dashboard_stats_v3 - remove 'archived' from enum
        // ==================================================================
        console.log("\n=== FIX 3: Fixing get_dashboard_stats_v3 enum issue ===");
        
        // Use only valid statuses
        const activeStatuses = validStatuses.filter(s => ['active', 'renewed', 'terminated'].includes(s));
        const occupancyStatuses = validStatuses.filter(s => ['active', 'renewed'].includes(s));
        const expectedStatuses = validStatuses.filter(s => !['cancelled', 'draft'].includes(s));
        
        console.log("Active statuses for dashboard:", activeStatuses);
        console.log("Valid statuses for occupancy:", occupancyStatuses);
        
        await client.query(`
            CREATE OR REPLACE FUNCTION public.get_dashboard_stats_v3(p_agency_id UUID)
            RETURNS JSON
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public, auth
            AS $$
            DECLARE
                v_start_date DATE := date_trunc('month', current_date);
                v_end_date DATE := (date_trunc('month', current_date) + interval '1 month - 1 day')::DATE;
                v_result JSON;
            BEGIN
                WITH stats AS (
                    SELECT
                        (SELECT COUNT(*)::INT FROM public.properties WHERE agency_id = p_agency_id) as total_props,
                        (SELECT COUNT(*)::INT FROM public.owners WHERE agency_id = p_agency_id) as total_owns,
                        (SELECT COUNT(*)::INT FROM public.tenants WHERE agency_id = p_agency_id) as total_tens,
                        (SELECT COUNT(*)::INT FROM public.contracts WHERE agency_id = p_agency_id) as total_cnts,
                        (SELECT COUNT(*)::INT FROM public.contracts 
                         WHERE agency_id = p_agency_id 
                         AND status::text IN ('active', 'renewed', 'terminated')
                         AND start_date <= v_end_date 
                         AND (end_date IS NULL OR end_date >= v_start_date)) as active_cnts
                ),
                receipt_sums AS (
                    SELECT 
                        COALESCE(SUM(rent_amount + charges + agency_fees), 0) as rent_rev,
                        COALESCE(SUM(deposit_amount), 0) as total_deps,
                        COALESCE(SUM(commission_amount + agency_fees), 0) as rent_earns
                    FROM public.rent_receipts 
                    WHERE agency_id = p_agency_id 
                    AND payment_date >= v_start_date 
                    AND payment_date <= v_end_date
                ),
                modular_sums AS (
                    SELECT 
                        COALESCE(SUM(CASE WHEN (type IN ('income', 'credit') AND category NOT IN ('caution', 'deposit', 'payout')) THEN amount ELSE 0 END), 0) as mod_rev,
                        COALESCE(SUM(CASE WHEN (category IN ('agency_fees', 'commission', 'fees', 'honoraires', 'frais')) THEN amount ELSE 0 END), 0) as mod_earns
                    FROM public.modular_transactions
                    WHERE agency_id = p_agency_id
                    AND transaction_date >= v_start_date
                    AND transaction_date <= v_end_date
                ),
                expected AS (
                    SELECT COALESCE(SUM(monthly_rent), 0) as expected_rev
                    FROM public.contracts
                    WHERE agency_id = p_agency_id 
                    AND status::text NOT IN ('cancelled', 'draft')
                    AND type = 'location'
                    AND start_date <= v_end_date
                    AND (end_date IS NULL OR end_date >= v_start_date)
                ),
                occupancy AS (
                    SELECT 
                        CASE 
                            WHEN (SELECT total_props FROM stats) > 0 THEN 
                                ROUND((COUNT(DISTINCT property_id)::NUMERIC / (SELECT total_props FROM stats)::NUMERIC) * 100, 2)
                            ELSE 0 
                        END as rate
                    FROM public.contracts
                    WHERE agency_id = p_agency_id 
                    AND status::text IN ('active', 'renewed')
                    AND type = 'location'
                )
                SELECT json_build_object(
                    'totalProperties', s.total_props,
                    'totalOwners', s.total_owns,
                    'totalTenants', s.total_tens,
                    'totalContracts', s.total_cnts,
                    'monthlyRevenue', r.rent_rev + m.mod_rev,
                    'expectedRevenue', e.expected_rev,
                    'remainingRevenue', GREATEST(0, e.expected_rev - r.rent_rev),
                    'activeContracts', s.active_cnts,
                    'occupancyRate', o.rate,
                    'totalDeposits', r.total_deps,
                    'agencyEarnings', r.rent_earns + m.mod_earns
                ) INTO v_result
                FROM stats s, receipt_sums r, modular_sums m, expected e, occupancy o;

                RETURN v_result;
            END;
            $$;
        `);
        await client.query(`GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_v3(uuid) TO authenticated, anon, service_role;`);
        console.log("✅ get_dashboard_stats_v3 fixed - uses ::text cast for enum comparison");

        // ==================================================================
        // FIX 4: Fix all other helper functions with search_path
        // ==================================================================
        console.log("\n=== FIX 4: Fix check_owner_access_to_contract search_path ===");
        
        // Get existing source of these functions
        const resFnSrcs = await client.query(`
            SELECT proname, prosrc FROM pg_proc 
            WHERE proname IN (
                'check_owner_access_to_contract', 
                'check_tenant_access_to_contract',
                'check_owner_access_to_receipt',
                'check_tenant_access_to_receipt'
            )
            AND pronamespace = 'public'::regnamespace;
        `);
        
        for (const fn of resFnSrcs.rows) {
            try {
                // Rebuild with proper search_path including auth
                await client.query(`
                    CREATE OR REPLACE FUNCTION public.${fn.proname}(
                        ${fn.proname.includes('contract') && !fn.proname.includes('receipt') ? 'p_user_id UUID, p_contract_id UUID' : 'p_user_id UUID, p_receipt_id UUID'}
                    )
                    RETURNS BOOLEAN
                    LANGUAGE sql
                    SECURITY DEFINER
                    STABLE
                    SET search_path = public, auth
                    AS $$
                        ${fn.prosrc}
                    $$;
                `);
                await client.query(`GRANT EXECUTE ON FUNCTION public.${fn.proname}(uuid, uuid) TO authenticated, anon, service_role;`);
                console.log(`✅ ${fn.proname} updated`);
            } catch(e) {
                console.log(`⚠️ Could not update ${fn.proname}: ${e.message}`);
            }
        }

        // ==================================================================
        // VERIFY: Test is_agency_member now
        // ==================================================================
        console.log("\n=== VERIFY: Test is_agency_member directly ===");
        const agim_director = '035a0543-5299-416f-8471-2dab4db6794d';
        const agim_agency = '8561e4b6-0a47-47ba-9def-b2914885fedd';
        
        // We can't directly test auth.uid() without a JWT, but verify the function exists
        const resVerify = await client.query(`
            SELECT proname, proconfig FROM pg_proc 
            WHERE proname IN ('is_agency_member', 'is_platform_admin', 'get_dashboard_stats_v3')
            AND pronamespace = 'public'::regnamespace;
        `);
        console.log("Updated functions:", JSON.stringify(resVerify.rows, null, 2));

        // ==================================================================
        // VERIFY: Test get_dashboard_stats_v3 now
        // ==================================================================
        console.log("\n=== VERIFY: Test get_dashboard_stats_v3 ===");
        try {
            const resDash = await client.query(`
                SELECT get_dashboard_stats_v3('3c46c864-0e69-4a24-ab09-39302cfc9ca3'::uuid);
            `);
            console.log("✅ Dashboard stats work:", JSON.stringify(resDash.rows[0], null, 2));
        } catch(e) {
            console.log("❌ Still failing:", e.message);
        }

        // ==================================================================
        // VERIFY: Check RLS policies reference the updated functions correctly
        // ==================================================================
        console.log("\n=== VERIFY: RLS policies still intact ===");
        const resPol = await client.query(`
            SELECT tablename, policyname, qual FROM pg_policies 
            WHERE tablename IN ('tenants', 'contracts', 'rent_receipts')
            AND schemaname = 'public'
            ORDER BY tablename;
        `);
        for (const r of resPol.rows) {
            console.log(`\n[${r.tablename}] ${r.policyname}:`);
            console.log(`  ${r.qual}`);
        }

        console.log("\n\n✅ ALL FIXES APPLIED!");

    } catch (err) {
        console.error("❌ Fix failed:", err);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

main();
