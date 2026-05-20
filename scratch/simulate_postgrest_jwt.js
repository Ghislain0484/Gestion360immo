import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log("✅ Connected!\n");

        // ==================================================================
        // 1. Check if auth.uid() / auth.email() functions exist
        // ==================================================================
        console.log("=== auth schema functions ===");
        const resAuthFns = await client.query(`
            SELECT proname, pronamespace::regnamespace, prosrc 
            FROM pg_proc 
            WHERE pronamespace = 'auth'::regnamespace
            ORDER BY proname;
        `);
        console.log("Auth functions:", resAuthFns.rows.map(r => r.proname));

        // ==================================================================
        // 2. Simulate EXACTLY what PostgREST does with JWT
        // ==================================================================
        console.log("\n=== Simulating PostgREST JWT context ===");
        
        // PostgREST sets these before executing queries
        const agim_director_id = '035a0543-5299-416f-8471-2dab4db6794d';
        const agim_agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd';
        
        await client.query(`BEGIN;`);
        // Simulate PostgREST: set role, set JWT claims config
        await client.query(`SET LOCAL role TO 'authenticated';`);
        await client.query(`
            SELECT set_config('request.jwt.claims', 
                '{"sub":"035a0543-5299-416f-8471-2dab4db6794d","aud":"authenticated","role":"authenticated","email":"matusalemeliman@gmail.com"}', 
                true);
        `);
        await client.query(`
            SELECT set_config('request.jwt.claim.sub', '035a0543-5299-416f-8471-2dab4db6794d', true);
        `);
        await client.query(`
            SELECT set_config('request.jwt.claim.role', 'authenticated', true);
        `);

        const resUID = await client.query(`SELECT auth.uid() as uid, auth.role() as role;`);
        console.log("auth.uid():", resUID.rows[0].uid);
        console.log("auth.role():", resUID.rows[0].role);

        const resIsMember = await client.query(`SELECT is_agency_member($1::uuid) as result;`, [agim_agency_id]);
        console.log("is_agency_member for AGIM:", resIsMember.rows[0]);

        // Direct inline check
        const resInline = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM public.agency_users 
                WHERE user_id = auth.uid() 
                AND agency_id = $1::uuid
            ) as result;
        `, [agim_agency_id]);
        console.log("Inline EXISTS check:", resInline.rows[0]);

        // Test tenant SELECT
        const resTenants = await client.query(`
            SELECT COUNT(*) FROM public.tenants WHERE agency_id = $1::uuid;
        `, [agim_agency_id]);
        console.log("Tenants count (in authenticated role):", resTenants.rows[0]);

        await client.query(`ROLLBACK;`);

        // ==================================================================
        // 3. Check agency_users RLS policies - CRITICAL!
        // ==================================================================
        console.log("\n=== agency_users RLS policies ===");
        const resAUPolicies = await client.query(`
            SELECT policyname, cmd, qual, with_check
            FROM pg_policies
            WHERE tablename = 'agency_users' AND schemaname = 'public';
        `);
        console.log(JSON.stringify(resAUPolicies.rows, null, 2));

        // ==================================================================
        // 4. Check if agency_users is readable by authenticated role
        // ==================================================================
        console.log("\n=== Test agency_users as authenticated ===");
        await client.query(`BEGIN;`);
        await client.query(`SET LOCAL role TO 'authenticated';`);
        await client.query(`
            SELECT set_config('request.jwt.claims', 
                '{"sub":"035a0543-5299-416f-8471-2dab4db6794d","role":"authenticated"}', 
                true);
        `);
        
        try {
            const resAU = await client.query(`
                SELECT * FROM public.agency_users WHERE user_id = '035a0543-5299-416f-8471-2dab4db6794d'::uuid;
            `);
            console.log("agency_users accessible (as authenticated):", resAU.rows.length, "rows");
            console.log(JSON.stringify(resAU.rows, null, 2));
        } catch(e) {
            console.log("❌ agency_users NOT accessible as authenticated:", e.message);
        }
        
        // Also test tenants
        try {
            const resT = await client.query(`
                SELECT COUNT(*) FROM public.tenants WHERE agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd'::uuid;
            `);
            console.log("tenants accessible:", resT.rows[0]);
        } catch(e) {
            console.log("❌ tenants NOT accessible as authenticated:", e.message);
        }
        
        await client.query(`ROLLBACK;`);

        // ==================================================================
        // 5. Check if auth.uid() exists and its source
        // ==================================================================
        console.log("\n=== auth.uid() function source ===");
        const resUIDSrc = await client.query(`
            SELECT prosrc FROM pg_proc 
            WHERE proname = 'uid' AND pronamespace = 'auth'::regnamespace;
        `);
        if (resUIDSrc.rows.length > 0) {
            console.log("auth.uid() source:", resUIDSrc.rows[0].prosrc);
        }

        // ==================================================================
        // 6. Check request.jwt.claims value in supabase context
        // ==================================================================
        console.log("\n=== Check current_setting behavior ===");
        await client.query(`BEGIN;`);
        await client.query(`SET LOCAL role TO 'authenticated';`);
        
        const resReq1 = await client.query(`SELECT current_setting('request.jwt.claims', true) as val;`);
        console.log("request.jwt.claims (no JWT set):", resReq1.rows[0].val);
        
        await client.query(`
            SELECT set_config('request.jwt.claims', 
                '{"sub":"035a0543-5299-416f-8471-2dab4db6794d","role":"authenticated"}', 
                true);
        `);
        
        const resReq2 = await client.query(`SELECT current_setting('request.jwt.claims', true) as val;`);
        console.log("request.jwt.claims (after set):", resReq2.rows[0].val);
        
        const resUID2 = await client.query(`SELECT auth.uid() as uid;`);
        console.log("auth.uid() after set:", resUID2.rows[0].uid);
        
        await client.query(`ROLLBACK;`);

    } catch (err) {
        console.error("❌ Script failed:", err.message);
        try { await client.query(`ROLLBACK;`); } catch(_) {}
    } finally {
        await client.end();
    }
}

main();
