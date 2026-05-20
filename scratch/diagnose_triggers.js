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

        const resTriggers = await client.query(`
            SELECT 
                trigger_name, 
                event_manipulation, 
                event_object_table, 
                action_statement, 
                action_timing
            FROM information_schema.triggers
            WHERE event_object_schema = 'auth' OR event_object_table = 'users';
        `);
        console.log("--- Triggers ---");
        console.log(resTriggers.rows);

        const resTriggerDefs = await client.query(`
            SELECT tgname, pg_get_triggerdef(oid) as trigger_def
            FROM pg_trigger
            WHERE tgrelid = 'auth.users'::regclass;
        `);
        console.log("--- Trigger Definitions on auth.users ---");
        console.log(resTriggerDefs.rows);

    } catch (err) {
        console.error("❌ Diagnostic failed:", err);
    } finally {
        await client.end();
    }
}

main();
