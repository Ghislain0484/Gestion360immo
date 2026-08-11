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
        
        console.log('\n--- USERS WITH DIALLO ---');
        const usersRes = await client.query(`
            SELECT id, email, first_name, last_name, agency_id
            FROM public.users
            WHERE email ILIKE '%diallo%' OR first_name ILIKE '%diallo%' OR last_name ILIKE '%diallo%';
        `);
        console.log(JSON.stringify(usersRes.rows, null, 2));

        console.log('\n--- AGENCY USERS WITH DIALLO USER ---');
        if (usersRes.rows.length > 0) {
            const userIds = usersRes.rows.map(u => `'${u.id}'`).join(',');
            const agencyUsersRes = await client.query(`
                SELECT id, agency_id, user_id, role 
                FROM public.agency_users 
                WHERE user_id IN (${userIds});
            `);
            console.log(JSON.stringify(agencyUsersRes.rows, null, 2));
            
            if (agencyUsersRes.rows.length > 0) {
                const agencyIds = agencyUsersRes.rows.map(au => `'${au.agency_id}'`).join(',');
                const agenciesRes = await client.query(`
                    SELECT id, name, settings FROM public.agencies WHERE id IN (${agencyIds});
                `);
                console.log('\n--- AGENCIES FOR DIALLO ---');
                console.log(JSON.stringify(agenciesRes.rows, null, 2));
            }
        }
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
