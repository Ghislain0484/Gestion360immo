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
        
        console.log('--- RECONCILIATION COMPLETE POUR FRANCOIS TIGORI ---');
        
        // 1. Charger les quittances
        const { rows: rentReceipts } = await client.query(`
            SELECT id, payment_status, total_amount, amount_paid, owner_payment, commission_amount, contract_id, property_id, payment_date, created_at
            FROM public.rent_receipts 
            WHERE owner_id = $1;
        `, [ownerId]);
        
        // 2. Charger les transactions de caisse
        const { rows: manualTrans } = await client.query(`
            SELECT id, amount, category, type, description, related_property_id, transaction_date, created_at
            FROM public.modular_transactions 
            WHERE related_owner_id = $1;
        `, [ownerId]);
        
        // 3. Charger les transactions de reversement du grand livre
        const { rows: ownerTrans } = await client.query(`
            SELECT id, montant, date_transaction, created_at, type, description
            FROM public.owner_transactions 
            WHERE owner_id = $1;
        `, [ownerId]);
        
        // 4. Charger les contrats
        const { rows: contracts } = await client.query(`
            SELECT id, property_id, commission_rate, commission_amount, extra_data, monthly_rent, charges
            FROM public.contracts;
        `);
        
        const getContractInfo = (contractId, propertyId) => {
            let contract = null;
            if (contractId) {
                contract = contracts.find(c => c.id === contractId);
            }
            if (!contract && propertyId) {
                contract = contracts.find(c => c.property_id === propertyId);
            }
            const monthlyRentContract = contract ? ((contract.monthly_rent || 0) + (contract.charges || 0)) : 0;
            const commissionRate = contract?.commission_rate !== undefined ? contract.commission_rate : 10;
            return { monthlyRentContract, commissionRate, contract };
        };

        // --- APPLIQUER LA LOGIQUE DU COMPOSANT ---
        
        // Déduplication des transactions manuelles de loyer par rapport aux reçus
        const uniqueManualRent = manualTrans.filter(m => {
            if (m.category !== 'rent_payment' || (m.type !== 'income' && m.type !== 'credit')) return true; // Conserver les autres (caution, payouts, etc.)
            const isDuplicated = rentReceipts.some(r =>
                r.property_id === m.related_property_id &&
                Math.abs(Number(r.amount_paid || r.total_amount) - Number(m.amount)) < 1 &&
                Math.abs(new Date(r.payment_date || r.created_at).getTime() - new Date(m.transaction_date || m.created_at).getTime()) < 172800000
            );
            return !isDuplicated;
        });

        console.log(`Nombre total de quittances (rentReceipts) : ${rentReceipts.length}`);
        console.log(`Nombre total de modular_transactions : ${manualTrans.length}`);
        console.log(`Nombre de modular_transactions dédupliquées : ${uniqueManualRent.length}`);

        // Calculer les gains depuis les reçus
        const earnedFromReceipts = rentReceipts.reduce((sum, r) => {
            if (r.payment_status === 'unpaid') return sum;
            
            const isPaid = r.payment_status === 'paid' || r.payment_status === 'full';
            const amountPaid = isPaid ? (Number(r.amount_paid || r.total_amount) || 0) : (Number(r.amount_paid) || 0);
            if (amountPaid === 0) return sum;

            const { monthlyRentContract, contract } = getContractInfo(r.contract_id, r.property_id);
            
            // Prioritize saved commission_amount / owner_payment on the receipt unless it's a partial payment
            let comm = Number(r.commission_amount);
            let ownerPart = Number(r.owner_payment);
            
            if (r.payment_status === 'partial' || isNaN(comm) || comm === 0 || isNaN(ownerPart) || ownerPart === 0) {
                const commType = contract?.extra_data?.commission_type || 'percentage';
                if (commType === 'fixed') {
                    comm = contract?.commission_amount !== undefined ? contract.commission_amount : 0;
                    ownerPart = Math.max(0, amountPaid - comm);
                } else {
                    const commRate = contract?.commission_rate !== undefined ? contract.commission_rate : 10;
                    comm = (amountPaid * commRate) / 100;
                    ownerPart = amountPaid - comm;
                }
            }

            const isFullRentReceipt = Math.abs(amountPaid - monthlyRentContract) <= Math.max(5000, monthlyRentContract * 0.05);
            if (isPaid && monthlyRentContract > 0 && isFullRentReceipt) {
                const commType = contract?.extra_data?.commission_type || 'percentage';
                if (commType === 'fixed') {
                    comm = contract?.commission_amount !== undefined ? contract.commission_amount : 0;
                    ownerPart = Math.max(0, monthlyRentContract - comm);
                } else {
                    const commRate = contract?.commission_rate !== undefined ? contract.commission_rate : 10;
                    comm = (monthlyRentContract * commRate) / 100;
                    ownerPart = monthlyRentContract - comm;
                }
            }
            
            return sum + ownerPart;
        }, 0);

        // Calculer les gains depuis les transactions manuelles
        const earnedFromManual = uniqueManualRent.reduce((sum, m) => {
            if (m.category !== 'rent_payment' || (m.type !== 'income' && m.type !== 'credit')) return sum;
            const match = m.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
            if (match) return sum + Number(match[1]);
            const { contract } = getContractInfo(undefined, m.related_property_id);
            const commType = contract?.extra_data?.commission_type || 'percentage';
            if (commType === 'fixed') {
                const comm = contract?.commission_amount !== undefined ? contract.commission_amount : 0;
                return sum + Math.max(0, Number(m.amount) - comm);
            } else {
                const commRate = contract?.commission_rate !== undefined ? contract.commission_rate : 10;
                return sum + (Number(m.amount) * (1 - commRate / 100));
            }
        }, 0);

        const totalAccumulated = earnedFromReceipts + earnedFromManual;

        // Payouts dédupliqués
        const allManualPayouts = uniqueManualRent.filter(m => m.category === 'owner_payout' && (m.type === 'expense' || m.type === 'debit' || m.type === 'debit_payout'));
        const ownerTxReversals = ownerTrans.filter(r => r.type !== 'credit');

        const totalReversed = ownerTxReversals.reduce((sum, r) => sum + Number(r.montant), 0) +
            allManualPayouts.reduce((sum, mp) => {
                const isDuplicated = ownerTxReversals.some(r => 
                    Math.abs(Number(r.montant) - Number(mp.amount)) < 1 &&
                    Math.abs(new Date(r.date_transaction || r.created_at).getTime() - new Date(mp.transaction_date || mp.created_at).getTime()) < 172800000
                );
                return isDuplicated ? sum : sum + Number(mp.amount);
            }, 0);

        const globalBalance = totalAccumulated - totalReversed;

        console.log('\n--- DETAIL COMPTABLE ---');
        console.log(`Gains depuis les quittances (rent_receipts) : ${earnedFromReceipts} FCFA`);
        console.log(`Gains depuis les transactions manuelles de loyer dédupliquées : ${earnedFromManual} FCFA`);
        console.log(`Total accumulé (Revenus) : ${totalAccumulated} FCFA`);
        console.log(`Total reversé (Dépenses/payouts dédupliqués) : ${totalReversed} FCFA`);
        console.log(`SOLDE GLOBAL RESTANT : ${globalBalance} FCFA`);

        // Analyser s'il reste des doublons non filtrés
        console.log('\n--- ANALYSE LOG DES TRANS MANUELLES DE LOYER ---');
        manualTrans.filter(m => m.category === 'rent_payment' && (m.type === 'income' || m.type === 'credit')).forEach(m => {
            const dateStr = new Date(m.transaction_date).toLocaleDateString('fr-FR');
            const dup = rentReceipts.find(r => 
                r.property_id === m.related_property_id &&
                Math.abs(Number(r.amount_paid || r.total_amount) - Number(m.amount)) < 1 &&
                Math.abs(new Date(r.payment_date || r.created_at).getTime() - new Date(m.transaction_date || m.created_at).getTime()) < 172800000
            );
            console.log(`Trans : ${m.amount} FCFA le ${dateStr} - Desc: ${m.description} | Doublon ? ${dup ? `Oui (Quittance #${dup.receipt_number} de ${dup.amount_paid} FCFA)` : 'Non'}`);
        });

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
