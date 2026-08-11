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
        
        const feesRes = await client.query('SELECT * FROM public.agency_fintech_fees ORDER BY created_at DESC LIMIT 10;');
        console.log('\n📋 Récents agency_fintech_fees :');
        console.table(feesRes.rows);

        const txsRes = await client.query('SELECT * FROM public.wallet_transactions ORDER BY created_at DESC LIMIT 10;');
        console.log('\n💸 Récents wallet_transactions :');
        console.table(txsRes.rows);

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
