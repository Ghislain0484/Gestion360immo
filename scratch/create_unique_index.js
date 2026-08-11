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
        
        console.log('📝 Création de l\'index unique anti-doublon sur rent_receipts...');
        const createIndexRes = await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_receipts_contract_period_unique 
            ON public.rent_receipts(contract_id, period_month, period_year);
        `);
        console.log('🎉 Index unique créé avec succès !');

    } catch (err) {
        console.error('❌ Erreur lors de la création de l\'index unique :', err);
    } finally {
        await client.end();
    }
}

run();
