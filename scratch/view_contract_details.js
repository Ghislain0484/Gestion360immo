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
        
        const contractRes = await client.query(`
            SELECT id, monthly_rent, charges, deposit, status 
            FROM public.contracts 
            WHERE id = '0afc320d-bb8d-47b5-a37b-f2dc39bc280c';
        `);
        console.log('Détails du contrat :');
        console.log(JSON.stringify(contractRes.rows, null, 2));

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
