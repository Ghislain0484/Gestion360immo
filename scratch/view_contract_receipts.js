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
        
        const receiptsRes = await client.query(`
            SELECT id, receipt_number, tenant_id, contract_id, period_month, period_year, rent_amount, charges, total_amount, amount_paid, balance_due, payment_status, payment_date, created_at 
            FROM public.rent_receipts 
            WHERE contract_id = '0afc320d-bb8d-47b5-a37b-f2dc39bc280c'
            ORDER BY period_year DESC, period_month DESC, created_at DESC;
        `);
        console.log('Toutes les quittances du contrat :');
        console.log(JSON.stringify(receiptsRes.rows, null, 2));

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
