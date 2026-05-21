import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log("✅ Connected!\n");

        // 1. Check all agency registration requests
        console.log("=== All requests (bypassing RLS) ===");
        const res1 = await client.query(`SELECT id, agency_name, status, created_at FROM public.agency_registration_requests;`);
        console.table(res1.rows);

        // 2. Check RLS policies on agency_registration_requests
        console.log("\n=== RLS Policies ===");
        const res2 = await client.query(`
            SELECT policyname, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'agency_registration_requests' AND schemaname = 'public';
        `);
        for (const p of res2.rows) {
            console.log(`[${p.policyname}] (${p.cmd})`);
            console.log(`  USING: ${p.qual}`);
            if (p.with_check) console.log(`  WITH CHECK: ${p.with_check}`);
        }

    } catch(e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}
main();
