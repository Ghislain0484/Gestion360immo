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
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'handle_new_user';
        `);
        console.log("--- handle_new_user definition ---");
        console.log(res.rows[0]?.prosrc || "Function not found");

    } catch (err) {
        console.error("❌ Diagnostic failed:", err);
    } finally {
        await client.end();
    }
}

main();
