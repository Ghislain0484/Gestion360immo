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

        // 1. Fetch all owners of AGIM
        const ownersRes = await client.query(`
            SELECT id, first_name, last_name 
            FROM public.owners 
            WHERE agency_id = $1;
        `, [agencyId]);
        const owners = ownersRes.rows;
        console.log(`Found ${owners.length} owners.`);

        // 2. Fetch all properties of AGIM to match
        const propertiesRes = await client.query(`
            SELECT id, title, owner_id 
            FROM public.properties 
            WHERE agency_id = $1;
        `, [agencyId]);
        const properties = propertiesRes.rows;

        // 3. For each owner, calculate receipts, commissions, payouts, and balances
        const ownerSummaries = [];

        for (const owner of owners) {
            // Rent receipts (Paid)
            const receiptsRes = await client.query(`
                SELECT id, amount_paid, total_amount, commission_amount, owner_payment, payment_status, payment_date
                FROM public.rent_receipts
                WHERE owner_id = $1 AND agency_id = $2;
            `, [owner.id, agencyId]);
            
            let totalRentCollected = 0;
            let totalCommissionDeducted = 0;
            let totalOwnerPaymentExpected = 0;

            for (const r of receiptsRes.rows) {
                const amount = Number(r.amount_paid || r.total_amount) || 0;
                totalRentCollected += amount;

                let comm = Number(r.commission_amount) || 0;
                let ownerPart = Number(r.owner_payment) || 0;
                
                if (comm === 0 && ownerPart === 0) {
                    // Fallback to default 10%
                    comm = amount * 0.1;
                    ownerPart = amount - comm;
                }
                totalCommissionDeducted += comm;
                totalOwnerPaymentExpected += ownerPart;
            }

            // Manual transactions (rent payments)
            const manualPaymentsRes = await client.query(`
                SELECT amount, description, transaction_date 
                FROM public.modular_transactions 
                WHERE related_owner_id = $1 AND agency_id = $2 AND category = 'rent_payment';
            `, [owner.id, agencyId]);

            let manualRentCollected = 0;
            let manualCommissionDeducted = 0;

            for (const m of manualPaymentsRes.rows) {
                const amount = Number(m.amount) || 0;
                manualRentCollected += amount;
                
                // default 10% fallback
                let comm = amount * 0.1;
                const match = m.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
                if (match) {
                    const ownerNet = Number(match[1]);
                    comm = amount - ownerNet;
                }
                manualCommissionDeducted += comm;
            }

            // Payouts recorded in owner_transactions (reversals)
            const ownerTxRes = await client.query(`
                SELECT id, montant, date_transaction, description, type 
                FROM public.owner_transactions 
                WHERE owner_id = $1 AND type != 'credit';
            `, [owner.id]);

            const totalOwnerTxReversed = ownerTxRes.rows.reduce((sum, r) => sum + (Number(r.montant) || 0), 0);

            // Payouts recorded in modular_transactions (owner_payout)
            const modularPayoutsRes = await client.query(`
                SELECT amount, transaction_date, description 
                FROM public.modular_transactions 
                WHERE related_owner_id = $1 AND agency_id = $2 AND category = 'owner_payout';
            `, [owner.id, agencyId]);

            // Filter out duplicated payouts (recorded in both tables)
            let totalModularReversed = 0;
            for (const mp of modularPayoutsRes.rows) {
                const amount = Number(mp.amount) || 0;
                const isDuplicated = ownerTxRes.rows.some(r => 
                    Math.abs(Number(r.montant) - amount) < 1 &&
                    Math.abs(new Date(r.date_transaction || r.created_at).getTime() - new Date(mp.transaction_date || mp.created_at).getTime()) < 172800000
                );
                if (!isDuplicated) {
                    totalModularReversed += amount;
                }
            }

            const totalPayouts = totalOwnerTxReversed + totalModularReversed;
            
            // Grand totals
            const grandTotalRent = totalRentCollected + manualRentCollected;
            const grandTotalCommission = totalCommissionDeducted + manualCommissionDeducted;
            const expectedNet = grandTotalRent - grandTotalCommission;
            const remainingBalance = expectedNet - totalPayouts;

            ownerSummaries.push({
                id: owner.id,
                name: `${owner.first_name} ${owner.last_name}`,
                receipts_count: receiptsRes.rows.length,
                total_rent: grandTotalRent,
                total_commission: grandTotalCommission,
                expected_net: expectedNet,
                total_payouts: totalPayouts,
                balance: remainingBalance,
                owner_tx_count: ownerTxRes.rows.length,
                modular_payouts_count: modularPayoutsRes.rows.length
            });
        }

        // Print summaries
        console.log('\n📊 Résumé financier des propriétaires de AGIM GROUP :');
        console.table(ownerSummaries.map(s => ({
            Nom: s.name,
            'Quittances': s.receipts_count,
            'Total Encaissé': s.total_rent,
            'Commission': s.total_commission,
            'Net Attendu': s.expected_net,
            'Reversé (Débitions)': s.total_payouts,
            'Reste (Balance)': s.balance
        })));

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
