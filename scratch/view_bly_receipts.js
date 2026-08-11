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
            SELECT id, receipt_number, tenant_id, contract_id, period_month, period_year, amount_paid, payment_date, created_at 
            FROM public.rent_receipts 
            WHERE receipt_number IN ('REC-202605-1778677726900', 'REC-202605-1778499996304');
        `);
        console.log('Les deux quittances doublonnées :');
        console.log(JSON.stringify(receiptsRes.rows, null, 2));

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
