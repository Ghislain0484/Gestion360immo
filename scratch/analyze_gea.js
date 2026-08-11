import pg from 'pg';
import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const agencyId = "96e00e23-e240-411e-bd20-95a15603f6cc"; // GEA-HOLDING SAU

const regions = [
  { name: 'Frankfurt (eu-central-1)', host: 'aws-0-eu-central-1.pooler.supabase.com' },
  { name: 'Paris (eu-west-3)', host: 'aws-0-eu-west-3.pooler.supabase.com' },
  { name: 'Ireland (eu-west-1)', host: 'aws-0-eu-west-1.pooler.supabase.com' },
  { name: 'London (eu-west-2)', host: 'aws-0-eu-west-2.pooler.supabase.com' },
  { name: 'Stockholm (eu-north-1)', host: 'aws-0-eu-north-1.pooler.supabase.com' },
  { name: 'Milan (eu-south-1)', host: 'aws-0-eu-south-1.pooler.supabase.com' },
  { name: 'Spain (eu-south-2)', host: 'aws-0-eu-south-2.pooler.supabase.com' },
  { name: 'N. Virginia (us-east-1)', host: 'aws-0-us-east-1.pooler.supabase.com' },
  { name: 'Ohio (us-east-2)', host: 'aws-0-us-east-2.pooler.supabase.com' },
  { name: 'N. California (us-west-1)', host: 'aws-0-us-west-1.pooler.supabase.com' },
  { name: 'Oregon (us-west-2)', host: 'aws-0-us-west-2.pooler.supabase.com' },
  { name: 'Canada (ca-central-1)', host: 'aws-0-ca-central-1.pooler.supabase.com' },
  { name: 'São Paulo (sa-east-1)', host: 'aws-0-sa-east-1.pooler.supabase.com' },
  { name: 'Singapore (ap-southeast-1)', host: 'aws-0-ap-southeast-1.pooler.supabase.com' },
  { name: 'Sydney (ap-southeast-2)', host: 'aws-0-ap-southeast-2.pooler.supabase.com' },
  { name: 'Tokyo (ap-northeast-1)', host: 'aws-0-ap-northeast-1.pooler.supabase.com' },
  { name: 'Seoul (ap-northeast-2)', host: 'aws-0-ap-northeast-2.pooler.supabase.com' },
  { name: 'Mumbai (ap-south-1)', host: 'aws-0-ap-south-1.pooler.supabase.com' },
  { name: 'Cape Town (af-south-1)', host: 'aws-0-af-south-1.pooler.supabase.com' }
];

function resolveHost(hostname) {
    return new Promise((resolve, reject) => {
        https.get(`https://8.8.8.8/resolve?name=${hostname}&type=A`, {
            headers: { 'accept': 'application/dns-json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.Answer && json.Answer.length > 0) {
                        const aRecord = json.Answer.find(ans => ans.type === 1);
                        if (aRecord) {
                            resolve(aRecord.data);
                        } else {
                            reject(new Error("No A record found in answers for: " + hostname));
                        }
                    } else {
                        reject(new Error("No answer from DNS API for: " + hostname));
                    }
                } catch(e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function tryConnect(region) {
  try {
    const ip = await resolveHost(region.host);
    const connectionString = `postgresql://postgres.jedknkbevxiyytsypjrv:Business%40gestion360immo.com@${ip}:5432/postgres`;
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false, servername: region.host }
    });

    await client.connect();
    return client;
  } catch (err) {
    return null;
  }
}

async function run() {
    console.log("🚀 Recherche du pooler régional actif via DoH et connexion à Supabase...");
    let client = null;
    for (const region of regions) {
        client = await tryConnect(region);
        if (client) {
            console.log(`✅ Connecté avec succès à la région : ${region.name} !`);
            break;
        }
    }

    if (!client) {
        console.error("❌ Impossible de se connecter à Supabase via aucun pooler régional.");
        return;
    }
    
    try {
        // 1. Get Agency details
        const agencyRes = await client.query('SELECT * FROM public.agencies WHERE agency_id = $1', [agencyId]);
        if (agencyRes.rows.length === 0) {
            console.log('❌ Agence introuvable !');
            return;
        }
        console.log(`\n🏢 Agence : ${agencyRes.rows[0].name} (ID: ${agencyId})`);

        // 2. Sum of Rent Receipts
        const receiptsRes = await client.query(
            'SELECT COALESCE(SUM(amount_paid), 0) as total_paid, COALESCE(SUM(total_amount), 0) as total_expected, COUNT(*) as count FROM public.rent_receipts WHERE agency_id = $1',
            [agencyId]
        );
        const receipts = receiptsRes.rows[0];
        console.log(`\n📊 Quittances de Loyer :`);
        console.log(`  - Nombre total de quittances : ${receipts.count}`);
        console.log(`  - Total attendu : ${Number(receipts.total_expected).toLocaleString('fr-FR')} FCFA`);
        console.log(`  - Total payé/encaissé (amount_paid) : ${Number(receipts.total_paid).toLocaleString('fr-FR')} FCFA`);

        // 3. Modular Transactions (Mouvements de Caisse)
        const modularRes = await client.query(
            'SELECT category, type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount FROM public.modular_transactions WHERE agency_id = $1 GROUP BY category, type ORDER BY type, category',
            [agencyId]
        );
        console.log(`\n💸 Mouvements de Caisse (modular_transactions) par catégorie/type :`);
        console.table(modularRes.rows.map(row => ({
            Type: row.type,
            Categorie: row.category,
            Nombre: row.count,
            'Montant Total (FCFA)': Number(row.total_amount).toLocaleString('fr-FR')
        })));

        // 4. Property Expenses (Dépenses travaux)
        const expensesRes = await client.query(
            'SELECT COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as count FROM public.property_expenses WHERE agency_id = $1',
            [agencyId]
        );
        const expenses = expensesRes.rows[0];
        console.log(`\n🛠️ Dépenses Travaux :`);
        console.log(`  - Nombre : ${expenses.count}`);
        console.log(`  - Total payé : ${Number(expenses.total_amount).toLocaleString('fr-FR')} FCFA`);

        // 5. Owners and their calculated balances
        const ownersRes = await client.query(
            'SELECT id, first_name, last_name, email FROM public.owners WHERE agency_id = $1',
            [agencyId]
        );
        console.log(`\n👥 Propriétaires enregistrés (${ownersRes.rows.length}) :`);
        
        for (const owner of ownersRes.rows) {
            // A. Earned from rent_receipts (total_amount * (1 - commission_rate/100)) or owner_payment
            const oReceiptsRes = await client.query(
                `SELECT r.amount_paid, r.total_amount, r.owner_payment, r.contract_id, r.property_id, c.commission_rate
                 FROM public.rent_receipts r
                 LEFT JOIN public.contracts c ON r.contract_id = c.id
                 WHERE r.owner_id = $1`,
                [owner.id]
            );

            let earnedFromReceipts = 0;
            oReceiptsRes.rows.forEach(r => {
                const commRate = r.commission_rate !== null ? Number(r.commission_rate) : 10; // Default 10%
                const ownerPart = r.owner_payment !== null ? Number(r.owner_payment) : (Number(r.total_amount) * (1 - commRate / 100));
                earnedFromReceipts += ownerPart;
            });

            // B. Earned from manual collections (modular_transactions where type='income' and category='rent_payment')
            const oManualRes = await client.query(
                `SELECT t.amount, t.category, t.type, t.description, t.related_property_id, c.commission_rate
                 FROM public.modular_transactions t
                 LEFT JOIN public.contracts c ON t.related_property_id = c.property_id AND c.status = 'active'
                 WHERE t.related_owner_id = $1`,
                [owner.id]
            );

            let earnedFromManual = 0;
            let paidToOwner = 0;

            oManualRes.rows.forEach(t => {
                if (t.type === 'debit' && t.category === 'owner_payout') {
                    paidToOwner += Number(t.amount);
                } else if (t.type === 'credit' && t.category === 'rent_payment') {
                    const match = t.description ? t.description.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/) : null;
                    if (match) {
                        earnedFromManual += Number(match[1]);
                    } else {
                        const commRate = t.commission_rate !== null ? Number(t.commission_rate) : 10;
                        earnedFromManual += Number(t.amount) * (1 - commRate / 100);
                    }
                }
            });

            // C. Resolved tickets (maintenance) charged to owner
            const maintenanceRes = await client.query(
                `SELECT COALESCE(SUM(cost), 0) as total_repairs FROM public.tickets 
                 WHERE owner_id = $1 AND charge_to = 'owner' AND status = 'resolved'`,
                [owner.id]
            );
            const repairs = Number(maintenanceRes.rows[0].total_repairs);

            const calculatedOwnerBalance = earnedFromReceipts + earnedFromManual - paidToOwner - repairs;
            const totalEarned = earnedFromReceipts + earnedFromManual;

            console.log(`  👤 ${owner.first_name} ${owner.last_name} (${owner.email || 'Pas d\'email'}) :`);
            console.log(`     - Total dû (loyers nets - commissions) : ${totalEarned.toLocaleString('fr-FR')} FCFA`);
            console.log(`     - Déduction Travaux imputés : ${repairs.toLocaleString('fr-FR')} FCFA`);
            console.log(`     - Total déjà reversé : ${paidToOwner.toLocaleString('fr-FR')} FCFA`);
            console.log(`     - Solde dû restant (devrait être 0 si tout reversé) : ${calculatedOwnerBalance.toLocaleString('fr-FR')} FCFA`);
        }

        // 6. Global Cash Balance Calculation
        const CREDIT_TYPES = ['income', 'credit', 'deposit'];
        const globalReceiptsRes = await client.query('SELECT COALESCE(SUM(amount_paid), COALESCE(SUM(total_amount), 0)) as total FROM public.rent_receipts WHERE agency_id = $1', [agencyId]);
        const globalReceiptsSum = Number(globalReceiptsRes.rows[0].total || 0);

        const globalManualCreditsRes = await client.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM public.modular_transactions WHERE agency_id = $1 AND type = ANY($2)",
            [agencyId, CREDIT_TYPES]
        );
        const globalManualCreditsSum = Number(globalManualCreditsRes.rows[0].total || 0);

        const globalCredits = globalReceiptsSum + globalManualCreditsSum;

        // DEBITS
        const globalManualDebitsRes = await client.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM public.modular_transactions WHERE agency_id = $1 AND NOT (type = ANY($2))",
            [agencyId, CREDIT_TYPES]
        );
        const globalManualDebitsSum = Number(globalManualDebitsRes.rows[0].total || 0);

        const globalExpensesSum = Number(expensesRes.rows[0].total_amount || 0);

        const globalDebits = globalManualDebitsSum + globalExpensesSum;
        const currentCaisseBalance = globalCredits - globalDebits;

        console.log(`\n🏦 Calcul du Solde de Caisse Global :`);
        console.log(`  [+] Entrées de fonds (Crédits) : ${globalCredits.toLocaleString('fr-FR')} FCFA`);
        console.log(`     * Encaissements loyers (quittances) : ${globalReceiptsSum.toLocaleString('fr-FR')} FCFA`);
        console.log(`     * Autres rentrées manuelles : ${globalManualCreditsSum.toLocaleString('fr-FR')} FCFA`);
        console.log(`  [-] Sorties de fonds (Débits) : ${globalDebits.toLocaleString('fr-FR')} FCFA`);
        console.log(`     * Retraits, reversements et dépenses manuels : ${globalManualDebitsSum.toLocaleString('fr-FR')} FCFA`);
        console.log(`     * Dépenses travaux enregistrées : ${globalExpensesSum.toLocaleString('fr-FR')} FCFA`);
        console.log(`  [=] Solde Actuel en Caisse : ${currentCaisseBalance.toLocaleString('fr-FR')} FCFA`);

        // 7. Check if there are any specific modular transactions that can explain the cash balance (e.g. caution)
        const detailedModularRes = await client.query(
            "SELECT id, transaction_date, type, amount, category, description FROM public.modular_transactions WHERE agency_id = $1 ORDER BY transaction_date DESC LIMIT 30",
            [agencyId]
        );
        console.log(`\n📋 Récents mouvements de caisse détaillés :`);
        console.table(detailedModularRes.rows.map(row => ({
            Date: row.transaction_date,
            Type: row.type,
            Categorie: row.category,
            Montant: Number(row.amount).toLocaleString('fr-FR'),
            Description: row.description
        })));

    } catch (err) {
        console.error('❌ Erreur:', err.message);
    } finally {
        await client.end();
    }
}

run();
