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
        console.log('⚡ Connecté à PostgreSQL !');

        console.log('\n--- USERS MATCHING DELO ---');
        const usersRes = await client.query(`
            SELECT id, email, first_name, last_name, agency_id
            FROM public.users
            WHERE email ILIKE '%delo%' OR first_name ILIKE '%delo%' OR last_name ILIKE '%delo%';
        `);
        console.log(JSON.stringify(usersRes.rows, null, 2));

        console.log('\n--- ALL USERS ---');
        const allUsersRes = await client.query(`
            SELECT id, email, first_name, last_name, agency_id
            FROM public.users
            LIMIT 50;
        `);
        console.log(JSON.stringify(allUsersRes.rows, null, 2));
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
