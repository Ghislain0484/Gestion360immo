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
        
        // Find tenant ID for Mahan Odette Bly
        const tenantRes = await client.query("SELECT id, first_name, last_name FROM public.tenants WHERE last_name ILIKE '%BLY%' OR first_name ILIKE '%BLY%';");
        console.log('Locataires trouvés :');
        console.table(tenantRes.rows);

        // Find receipts for May 2026
        const receiptsRes = await client.query(`
            SELECT id, receipt_number, tenant_id, contract_id, period_month, period_year, amount_paid, payment_date, created_at 
            FROM public.rent_receipts 
            WHERE period_month = 5 AND period_year = 2026
            ORDER BY created_at DESC;
        `);
        console.log('Quittances de mai 2026 :');
        console.table(receiptsRes.rows);

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
