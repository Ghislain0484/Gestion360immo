import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        const triggersRes = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'rent_receipts';
        `);
        console.log('Triggers on rent_receipts:');
        for (const row of triggersRes.rows) {
            console.log(`- ${row.trigger_name} [${row.event_manipulation}]: ${row.action_statement}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
