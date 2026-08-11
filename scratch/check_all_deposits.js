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

        // Fetch all receipts with deposit_amount > 0 for AGIM
        const receiptsRes = await client.query(`
            SELECT r.id, r.receipt_number, r.amount_paid, r.total_amount, r.deposit_amount, r.commission_amount, r.owner_payment, r.payment_date,
                   o.id as owner_id, o.first_name, o.last_name
            FROM public.rent_receipts r
            JOIN public.owners o ON o.id = r.owner_id
            WHERE r.agency_id = $1 AND r.deposit_amount > 0
            ORDER BY r.payment_date DESC;
        `, [agencyId]);

        console.log(`\n📋 Receipts with caution paid (Total: ${receiptsRes.rows.length}):`);
        
        for (const r of receiptsRes.rows) {
            console.log(`\n--------------------------------------------------`);
            console.log(`Quittance: ${r.receipt_number} | Owner: ${r.first_name} ${r.last_name}`);
            console.log(`Date: ${r.payment_date} | Loyer payé: ${r.amount_paid} | Caution payée: ${r.deposit_amount} | Total: ${r.total_amount}`);
            console.log(`Stored Comm: ${r.commission_amount} | Stored OwnerPayment: ${r.owner_payment}`);

            // Fetch payouts for this owner around this date
            const payoutsRes = await client.query(`
                SELECT montant, date_transaction, description
                FROM public.owner_transactions
                WHERE owner_id = $1 AND type = 'debit'
                ORDER BY date_transaction;
            `, [r.owner_id]);
            
            console.log(`Payouts for this owner:`);
            console.table(payoutsRes.rows.map(p => ({
                Montant: p.montant,
                Date: p.date_transaction,
                Desc: p.description
            })));
        }

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
