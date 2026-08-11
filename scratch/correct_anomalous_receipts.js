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

        // Begin Transaction
        await client.query('BEGIN');

        // 1. Correct Mme Kassoum Bassirou receipt
        const res1 = await client.query(`
            UPDATE public.rent_receipts
            SET amount_paid = 160000,
                commission_amount = 16000,
                owner_payment = 144000
            WHERE id = 'ca1d877f-a761-4374-a54c-99b078fc4c78'
            RETURNING receipt_number, amount_paid, commission_amount, owner_payment;
        `);
        console.log('Updated Mme Kassoum:', res1.rows[0]);

        // 2. Correct Ghislain Bohoo receipt
        const res2 = await client.query(`
            UPDATE public.rent_receipts
            SET amount_paid = 330000,
                commission_amount = 33000,
                owner_payment = 297000
            WHERE id = '60601cf4-3f5c-44af-a68a-f8305ee3293f'
            RETURNING receipt_number, amount_paid, commission_amount, owner_payment;
        `);
        console.log('Updated Ghislain Bohoo:', res2.rows[0]);

        // Commit Transaction
        await client.query('COMMIT');
        console.log('🎉 Mise à jour terminée avec succès en base de données !');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur, transaction annulée:', err);
    } finally {
        await client.end();
    }
}

run();
