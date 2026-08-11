import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:5432/postgres";
const ownerId = "7713993a-3d8a-4997-8af2-7acb68724783";

async function run() {
    console.log('Trying to connect to port 5432...');
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('⚡ Connected to PostgreSQL on 5432!');
        
        const receiptsRes = await client.query(`
            SELECT id, receipt_number, period_month, period_year, rent_amount, charges, total_amount, amount_paid, owner_payment, payment_status, payment_date
            FROM rent_receipts
            WHERE owner_id = $1
            ORDER BY period_year DESC, period_month DESC;
        `, [ownerId]);
        
        console.log('\n📋 Rent Receipts for François Tigori:');
        console.table(receiptsRes.rows);

        const payoutsRes = await client.query(`
            SELECT id, amount, transaction_date, description, type, category
            FROM modular_transactions
            WHERE related_owner_id = $1
            ORDER BY transaction_date DESC;
        `, [ownerId]);
        
        console.log('\n📋 Transactions from modular_transactions:');
        console.table(payoutsRes.rows);

        const ownerTransRes = await client.query(`
            SELECT id, montant, date_transaction, description, type
            FROM owner_transactions
            WHERE owner_id = $1
            ORDER BY date_transaction DESC;
        `, [ownerId]);
        
        console.log('\n📋 Payouts from owner_transactions:');
        console.table(ownerTransRes.rows);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

run();
