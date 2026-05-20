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

        console.log("Testing create_platform_admin RPC...");
        
        // Let's call the public.create_platform_admin function
        const res = await client.query(`
            SELECT public.create_platform_admin(
                'testadmin@gestion360.com',
                'TestPassword123!',
                'Jean',
                'TestAdmin',
                'super_admin',
                '{"agencies": true}'::jsonb
            ) as result;
        `);

        console.log("RPC call result:");
        console.log(JSON.stringify(res.rows[0].result, null, 2));

    } catch (err) {
        console.error("❌ RPC failed with error:", err.message);
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
