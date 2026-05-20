import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected!");

        const res = await client.query(`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename, policyname;
        `);
        
        console.log(`Found ${res.rows.length} policies.`);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error("❌ Diagnostic failed:", err);
    } finally {
        await client.end();
    }
}

main();
