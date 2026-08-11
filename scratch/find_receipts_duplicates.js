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
        
        console.log('--- RECHERCHE DE DOUBLONS DE QUITTANCES POUR FRANCOIS TIGORI ---');
        
        const { rows: receipts } = await client.query(`
            SELECT r.id, r.receipt_number, r.payment_status, r.total_amount, r.amount_paid, r.owner_payment, r.period_month, r.period_year, r.payment_date, r.created_at, p.title as property_title
            FROM public.rent_receipts r
            JOIN public.properties p ON r.property_id = p.id
            WHERE r.owner_id = $1
            ORDER BY r.period_year DESC, r.period_month DESC, p.title;
        `, [ownerId]);
        
        console.log(`Nombre total de quittances : ${receipts.length}`);
        
        // Regrouper par propriété et par période (mois/année) pour voir s'il y a des doublons
        const groups = {};
        receipts.forEach(r => {
            const key = `${r.property_title}_${r.period_month}_${r.period_year}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        
        console.log('\n--- DOUBLONS DETECTES (Même bien + même mois/année) ---');
        let dupCount = 0;
        Object.keys(groups).forEach(key => {
            if (groups[key].length > 1) {
                dupCount++;
                console.log(`\nClé: ${key} (${groups[key].length} entrées) :`);
                groups[key].forEach(r => {
                    console.log(`  - Reçu #${r.receipt_number} | Statut: ${r.payment_status} | Total: ${r.total_amount} | Payé: ${r.amount_paid} | Part Proprio: ${r.owner_payment} | Créé le: ${new Date(r.created_at).toLocaleString('fr-FR')}`);
                });
            }
        });
        
        if (dupCount === 0) {
            console.log('Aucun doublon trouvé (même bien + même période).');
        }

        console.log('\n--- SOMME DES REVENUS PAR BIEN ---');
        const propSums = {};
        receipts.forEach(r => {
            if (!propSums[r.property_title]) propSums[r.property_title] = { totalPaid: 0, count: 0 };
            propSums[r.property_title].totalPaid += Number(r.amount_paid) || 0;
            propSums[r.property_title].count++;
        });
        
        Object.keys(propSums).forEach(title => {
            console.log(`- ${title} : ${propSums[title].totalPaid} FCFA (${propSums[title].count} quittances)`);
        });

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
