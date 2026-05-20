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

        console.log("\n--- Users in public.users ---");
        const resUsers = await client.query(`
            SELECT id, email, first_name, last_name, is_active FROM public.users LIMIT 10;
        `);
        console.log(resUsers.rows);

        console.log("\n--- Platform Admins ---");
        const resAdmins = await client.query(`
            SELECT user_id, role, is_active FROM public.platform_admins;
        `);
        console.log(resAdmins.rows);

        console.log("\n--- Agency Users ---");
        const resAgencyUsers = await client.query(`
            SELECT user_id, agency_id, role FROM public.agency_users LIMIT 10;
        `);
        console.log(resAgencyUsers.rows);

    } catch (err) {
        console.error("❌ Diagnostic failed:", err);
    } finally {
        await client.end();
    }
}

main();
