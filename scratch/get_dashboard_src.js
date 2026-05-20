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

        // Get full source of get_dashboard_stats_v3
        const resSrc = await client.query(`
            SELECT prosrc, prorettype::regtype as rettype, proargnames, proargtypes::text
            FROM pg_proc WHERE proname = 'get_dashboard_stats_v3';
        `);
        
        if (resSrc.rows.length > 0) {
            console.log("Return type:", resSrc.rows[0].rettype);
            console.log("Args:", resSrc.rows[0].proargnames);
            console.log("\nFull source:");
            console.log(resSrc.rows[0].prosrc);
        }

    } catch (err) {
        console.error("❌ Failed:", err);
    } finally {
        await client.end();
    }
}

main();
