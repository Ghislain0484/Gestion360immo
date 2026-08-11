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
            SELECT id, receipt_number, tenant_id, contract_id, period_month, period_year, rent_amount, amount_paid, payment_status, created_at 
            FROM public.rent_receipts 
            WHERE contract_id = '895f367e-0294-4f29-ba1c-4d028e7534ff'
            ORDER BY period_year DESC, period_month DESC, created_at DESC;
        `);
        console.log('Quittances de Appolinaire Kouassi :');
        console.log(JSON.stringify(receiptsRes.rows, null, 2));

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
