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
        
        const feesRes = await client.query('SELECT * FROM public.agency_fintech_fees WHERE status = \'pending\';');
        const txsRes = await client.query('SELECT * FROM public.wallet_transactions;');
        
        const commissionTxs = txsRes.rows.filter((tx) =>
            tx.type === 'commission' || 
            (tx.type === 'usage' && tx.description?.toLowerCase().includes('commission'))
        );

        for (const fee of feesRes.rows) {
            const matchingTx = commissionTxs.find((tx) => 
                tx.agency_id === fee.agency_id && 
                Math.abs(Number(tx.amount)) === Number(fee.commission_amount)
            );
            
            if (matchingTx) {
                console.log(`🎉 Match found! Updating fee ID: ${fee.id} with status = 'paid'`);
                await client.query(`
                    UPDATE public.agency_fintech_fees 
                    SET status = 'paid', paid_at = $1, transaction_id = $2 
                    WHERE id = $3;
                `, [matchingTx.created_at, matchingTx.id, fee.id]);
                console.log(`✓ Updated fee ID: ${fee.id}`);
            }
        }
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
