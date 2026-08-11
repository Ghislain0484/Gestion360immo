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

        const targets = [
            { id: '973919e2-ed6d-436c-aa5f-2e104a21dc44', name: 'Mme KASSOUM BASSIROU' },
            { id: '7ed09c7c-ce07-4315-83e9-10a8e6f6e451', name: 'GHISLAIN BOHOO' },
            { id: '26733422-c84f-497e-9312-a513199f0622', name: 'Mme RAYMOND' }
        ];

        const auditData = {};

        for (const target of targets) {
            // 1. Quittances (Rent receipts)
            const receipts = await client.query(`
                SELECT id, receipt_number, total_amount, amount_paid, commission_amount, owner_payment, payment_status, payment_date
                FROM public.rent_receipts
                WHERE owner_id = $1 AND agency_id = $2
                ORDER BY payment_date;
            `, [target.id, agencyId]);

            // 2. Transactions Caisse (modular_transactions)
            const modular = await client.query(`
                SELECT id, category, type, amount, description, transaction_date
                FROM public.modular_transactions
                WHERE related_owner_id = $1 AND agency_id = $2
                ORDER BY transaction_date;
            `, [target.id, agencyId]);

            // 3. Reversements (owner_transactions)
            const reversals = await client.query(`
                SELECT id, montant, date_transaction, description, type, created_at
                FROM public.owner_transactions
                WHERE owner_id = $1
                ORDER BY date_transaction, created_at;
            `, [target.id]);

            auditData[target.name] = {
                receipts: receipts.rows,
                modular_transactions: modular.rows,
                reversals: reversals.rows
            };
        }

        fs.writeFileSync('scratch/agim_details_output.json', JSON.stringify(auditData, null, 2));
        console.log('✅ Audit JSON sauvegardé dans scratch/agim_details_output.json !');

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
