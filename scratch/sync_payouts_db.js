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
        
        console.log('Synchronisation des payouts manquants de modular_transactions vers owner_transactions...');
        
        const syncQuery = `
            INSERT INTO public.owner_transactions (
                owner_id, 
                agency_id, 
                type, 
                montant, 
                mode_paiement, 
                reference, 
                description, 
                notes, 
                date_transaction, 
                created_by
            )
            SELECT 
                related_owner_id, 
                agency_id, 
                'debit', 
                amount, 
                CASE 
                    WHEN payment_method = 'bank_transfer' THEN 'virement'
                    WHEN payment_method = 'mobile_money' THEN 'mobile_money'
                    WHEN payment_method = 'check' THEN 'cheque'
                    ELSE 'especes'
                END,
                '',
                description,
                'Synchronisé depuis les transactions modulaires caisse',
                transaction_date,
                created_by
            FROM public.modular_transactions mt
            WHERE category = 'owner_payout' 
              AND related_owner_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM public.owner_transactions ot 
                  WHERE ot.owner_id = mt.related_owner_id 
                    AND ABS(ot.montant - mt.amount) < 0.01
                    AND (
                        ot.date_transaction::date = mt.transaction_date::date
                        OR ABS(extract(epoch from ot.date_transaction) - extract(epoch from mt.created_at)) < 86400
                    )
              );
        `;
        
        const res = await client.query(syncQuery);
        console.log(`✅ Nombre de lignes synchronisées : ${res.rowCount}`);
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
