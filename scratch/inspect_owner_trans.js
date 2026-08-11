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
        const ownerId = '7713993a-3d8a-4997-8af2-7acb68724783';
        
        console.log('--- OWNER TRANSACTIONS ---');
        const { rows: ownerTrans } = await client.query(
            `SELECT id, type, montant, mode_paiement, reference, description, date_transaction FROM public.owner_transactions WHERE owner_id = $1;`,
            [ownerId]
        );
        console.log(ownerTrans);

        console.log('\n--- MODULAR TRANSACTIONS ---');
        const { rows: modularTrans } = await client.query(
            `SELECT id, type, category, amount, description, transaction_date, payment_method FROM public.modular_transactions WHERE related_owner_id = $1;`,
            [ownerId]
        );
        console.log(modularTrans);
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
