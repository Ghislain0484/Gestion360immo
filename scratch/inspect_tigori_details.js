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
        
        console.log('--- RECHERCHE DETAILLEE DES TRANSACTIONS POUR FRANCOIS TIGORI ---');
        
        // 1. modular_transactions
        const { rows: modular } = await client.query(`
            SELECT id, amount, category, type, description, transaction_date, created_at
            FROM public.modular_transactions 
            WHERE related_owner_id = $1;
        `, [ownerId]);
        
        console.log(`\n--- MODULAR TRANSACTIONS (${modular.length}) ---`);
        modular.forEach(m => {
            console.log(`- ID: ${m.id} | Cat: ${m.category} | Type: ${m.type} | Montant: ${m.amount} | Date: ${m.transaction_date} | Desc: ${m.description}`);
        });
        
        // 2. owner_transactions
        const { rows: ownerTx } = await client.query(`
            SELECT id, montant, date_transaction, created_at, type, description, reference
            FROM public.owner_transactions 
            WHERE owner_id = $1;
        `, [ownerId]);
        
        console.log(`\n--- OWNER TRANSACTIONS (${ownerTx.length}) ---`);
        ownerTx.forEach(o => {
            console.log(`- ID: ${o.id} | Type: ${o.type} | Montant: ${o.montant} | Date: ${o.date_transaction} | Desc: ${o.description} | Ref: ${o.reference}`);
        });

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
