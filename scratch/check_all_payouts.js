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

        // Fetch all owner_transactions for AGIM GROUP owners
        const otRes = await client.query(`
            SELECT ot.id, ot.montant, ot.date_transaction, ot.description, ot.type, o.first_name, o.last_name
            FROM public.owner_transactions ot
            JOIN public.owners o ON o.id = ot.owner_id
            WHERE o.agency_id = $1
            ORDER BY ot.date_transaction DESC;
        `, [agencyId]);

        console.log(`\n📤 Total owner_transactions (payouts): ${otRes.rows.length}`);
        console.table(otRes.rows.slice(0, 15).map(r => ({
            Propriétaire: `${r.first_name} ${r.last_name}`,
            Montant: r.montant,
            DateTx: r.date_transaction,
            Description: r.description
        })));

        // Fetch all modular_transactions of category owner_payout
        const mtRes = await client.query(`
            SELECT mt.id, mt.amount, mt.transaction_date, mt.description, o.first_name, o.last_name
            FROM public.modular_transactions mt
            JOIN public.owners o ON o.id = mt.related_owner_id
            WHERE mt.agency_id = $1 AND mt.category = 'owner_payout'
            ORDER BY mt.transaction_date DESC;
        `, [agencyId]);

        console.log(`\n📥 Total modular_transactions (payouts): ${mtRes.rows.length}`);
        console.table(mtRes.rows.slice(0, 15).map(r => ({
            Propriétaire: `${r.first_name} ${r.last_name}`,
            Montant: r.amount,
            DateTx: r.transaction_date,
            Description: r.description
        })));

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
