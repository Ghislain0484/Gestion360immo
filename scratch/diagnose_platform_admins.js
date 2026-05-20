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

        console.log("\n--- Policies on 'platform_admins' ---");
        const resPolicies = await client.query(`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'platform_admins';
        `);
        console.log(JSON.stringify(resPolicies.rows, null, 2));

        console.log("\n--- Definition of 'view_platform_admins' ---");
        const resView = await client.query(`
            SELECT definition 
            FROM pg_views 
            WHERE viewname = 'view_platform_admins';
        `);
        console.log(resView.rows[0]?.definition || "View not found");

        console.log("\n--- Columns in 'platform_admins' ---");
        const resCols = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'platform_admins';
        `);
        console.log(resCols.rows);

        console.log("\n--- RLS Status for 'platform_admins' ---");
        const resRLS = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE tablename = 'platform_admins';
        `);
        console.log(resRLS.rows);

    } catch (err) {
        console.error("❌ Diagnostic failed:", err);
    } finally {
        await client.end();
    }
}

main();
