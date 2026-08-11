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

        // Query all rent receipts in the DB with this pattern
        const res = await client.query(`
            SELECT r.id, r.receipt_number, r.amount_paid, r.total_amount, r.deposit_amount, r.commission_amount, r.owner_payment, r.payment_status, r.payment_date,
                   r.agency_id, o.first_name || ' ' || o.last_name as owner_name
            FROM public.rent_receipts r
            LEFT JOIN public.owners o ON o.id = r.owner_id
            WHERE (r.payment_status = 'full' OR r.payment_status = 'paid')
              AND r.deposit_amount > 0
              AND r.amount_paid < r.total_amount
            ORDER BY r.payment_date DESC;
        `);

        console.log(`\n📋 Anomalies trouvées dans toute la base de données : ${res.rows.length}`);
        console.table(res.rows.map(r => ({
            ID: r.id,
            AgencyID: r.agency_id,
            Numero: r.receipt_number,
            Propriétaire: r.owner_name || 'Inconnu',
            Encaissé: r.amount_paid,
            Total: r.total_amount,
            Caution: r.deposit_amount,
            Date: r.payment_date
        })));

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
