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

        // Fetch transactions in modular_transactions where related_owner_id is null
        const res = await client.query(`
            SELECT id, amount, type, category, description, transaction_date, created_at 
            FROM public.modular_transactions 
            WHERE agency_id = $1 AND related_owner_id IS NULL
            ORDER BY transaction_date DESC;
        `, [agencyId]);

        console.log(`\n📋 Transactions non liées à un propriétaire (${res.rows.length}) :`);
        console.table(res.rows.map(r => ({
            ID: r.id,
            Montant: r.amount,
            Type: r.type,
            Categorie: r.category,
            Description: r.description,
            Date: r.transaction_date
        })));

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
