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
        const ownerId = '7713993a-3d8a-4997-8af2-7acb68724783';
        
        console.log('--- RECHERCHE DETAILLEE DES QUITTANCES DE LOYER ---');
        
        const { rows: receipts } = await client.query(`
            SELECT r.id, r.receipt_number, r.period_month, r.period_year, r.payment_status, r.amount_paid, r.total_amount, r.owner_payment, r.payment_date, r.created_at,
                   p.title as property_title
            FROM public.rent_receipts r
            JOIN public.properties p ON r.property_id = p.id
            WHERE r.owner_id = $1
            ORDER BY r.period_year DESC, r.period_month DESC, p.title;
        `, [ownerId]);
        
        console.log(`Nombre total de quittances : ${receipts.length}`);
        
        // Print the first 30 receipts
        receipts.slice(0, 35).forEach((r, i) => {
            console.log(`[${i+1}] Bien: ${r.property_title} | Période: ${r.period_month}/${r.period_year} | Statut: ${r.payment_status} | Montant Payé: ${r.amount_paid} | Total: ${r.total_amount} | Owner Part: ${r.owner_payment} | Date paiement: ${r.payment_date}`);
        });

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
