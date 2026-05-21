import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        const res = await client.query(`
            SELECT proname, prosrc 
            FROM pg_proc 
            WHERE pronamespace = 'public'::regnamespace 
            AND proname IN ('create_platform_admin', 'register_agency', 'register_owner_v2', 'create_user_for_owner');
        `);
        
        for (const r of res.rows) {
            console.log('--- ' + r.proname + ' ---');
            console.log(r.prosrc);
            console.log('\n');
        }
    } finally {
        await client.end();
    }
}

main();
