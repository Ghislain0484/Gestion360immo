import pkg from 'pg';
import fs from 'fs';
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

        // 1. Audit Eliman Matuzalem
        const targetId = '324b4a8a-e810-4679-bfd5-94f19c372fa7';
        
        const receipts = await client.query(`
            SELECT id, receipt_number, total_amount, amount_paid, commission_amount, owner_payment, payment_status, payment_date
            FROM public.rent_receipts
            WHERE owner_id = $1 AND agency_id = $2
            ORDER BY payment_date;
        `, [targetId, agencyId]);

        const modular = await client.query(`
            SELECT id, category, type, amount, description, transaction_date
            FROM public.modular_transactions
            WHERE related_owner_id = $1 AND agency_id = $2
            ORDER BY transaction_date;
        `, [targetId, agencyId]);

        const reversals = await client.query(`
            SELECT id, montant, date_transaction, description, type, created_at
            FROM public.owner_transactions
            WHERE owner_id = $1
            ORDER BY date_transaction, created_at;
        `, [targetId]);

        const matuzalemData = {
            receipts: receipts.rows,
            modular_transactions: modular.rows,
            reversals: reversals.rows
        };

        fs.writeFileSync('scratch/matuzalem_details.json', JSON.stringify(matuzalemData, null, 2));
        console.log('✅ Détails de Matuzalem sauvegardés dans scratch/matuzalem_details.json !');

        // 2. Trouver toutes les quittances de AGIM où commission_amount = 0 ou amount_paid != total_amount
        const anomalies = await client.query(`
            SELECT id, receipt_number, owner_id, total_amount, amount_paid, commission_amount, owner_payment, payment_status, payment_date
            FROM public.rent_receipts
            WHERE agency_id = $1 AND (commission_amount = 0 OR amount_paid != total_amount OR commission_amount IS NULL OR owner_payment IS NULL)
            ORDER BY payment_date;
        `, [agencyId]);
        
        console.log(`\n📋 Nombre d'anomalies de quittances trouvées : ${anomalies.rows.length}`);
        
        // Obtenir le nom des propriétaires pour ces anomalies
        const ownersRes = await client.query(`
            SELECT id, first_name, last_name FROM public.owners WHERE agency_id = $1;
        `, [agencyId]);
        const ownersMap = {};
        ownersRes.rows.forEach(o => {
            ownersMap[o.id] = `${o.first_name} ${o.last_name}`;
        });

        const formattedAnomalies = anomalies.rows.map(a => ({
            Numero: a.receipt_number,
            Propriétaire: ownersMap[a.owner_id] || 'Inconnu',
            Total: a.total_amount,
            Encaissé: a.amount_paid,
            Comm: a.commission_amount,
            PartProprio: a.owner_payment,
            Status: a.payment_status,
            Date: a.payment_date
        }));

        console.table(formattedAnomalies);

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
