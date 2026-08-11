import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";
const agencyId = '8561e4b6-0a47-47ba-9def-b2914885fedd';

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('⚡ Connecté à PostgreSQL !');
        
        // 1. Liste de toutes les tables publiques
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('\n📋 Tables publiques dans la base :');
        console.log(tablesRes.rows.map(r => r.table_name).join(', '));

        // 2. Liste des propriétaires de AGIM
        const ownersRes = await client.query(`
            SELECT id, first_name, last_name, email 
            FROM public.owners 
            WHERE agency_id = $1;
        `, [agencyId]);
        console.log('\n📋 Propriétaires de AGIM GROUP :');
        console.table(ownersRes.rows);

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
