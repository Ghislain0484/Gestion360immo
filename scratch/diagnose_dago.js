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

        const user_id = 'f14680a2-e1da-4d35-a5c2-7e26113dee3d';
        console.log(`\n--- agency_users for Jean Paul DAGO (${user_id}) ---`);
        const resAgencies = await client.query(`
            SELECT * FROM public.agency_users WHERE user_id = $1;
        `, [user_id]);
        console.log(resAgencies.rows);

        console.log(`\n--- Is he a platform admin? ---`);
        const resAdmin = await client.query(`
            SELECT * FROM public.platform_admins WHERE user_id = $1;
        `, [user_id]);
        console.log(resAdmin.rows);

    } catch (err) {
        console.error("❌ Diagnostic failed:", err);
    } finally {
        await client.end();
    }
}

main();
