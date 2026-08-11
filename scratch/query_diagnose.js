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

        // Fetch contracts
        const { rows: contracts } = await client.query(`SELECT * FROM public.contracts;`);
        
        // Fetch receipts
        const { rows: receipts } = await client.query(`
            SELECT * FROM public.rent_receipts WHERE owner_id = $1;
        `, [ownerId]);

        // Fetch modular transactions
        const { rows: manualTrans } = await client.query(`
            SELECT * FROM public.modular_transactions WHERE related_owner_id = $1;
        `, [ownerId]);

        // Fetch owner_transactions
        const { rows: ownerTrans } = await client.query(`
            SELECT * FROM public.owner_transactions WHERE owner_id = $1;
        `, [ownerId]);

        console.log(`=== SIMULATION DE CALCULS POUR FRANCOIS TIGORI ===`);
        console.log(`Nombre de quittances: ${receipts.length}`);
        console.log(`Nombre de trans modulaires: ${manualTrans.length}`);
        console.log(`Nombre de trans owner: ${ownerTrans.length}`);

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
            return { monthlyRentContract, commissionRate };
        };

        // ----------------------------------------------------
        // LOGIQUE 1: OwnerRentSummary.tsx
        // ----------------------------------------------------
        const totalAccumulatedSummary = receipts.reduce((sum, r) => {
            const { monthlyRentContract, commissionRate } = getContractInfo(r.contract_id, r.property_id);
            const isPaid = r.payment_status === 'paid' || r.payment_status === 'full' || (r.amount_paid ?? r.total_amount) >= r.total_amount;
            
            let ownerPart = Number(r.owner_payment) || 0;
            const isFullRentReceipt = Math.abs((r.amount_paid ?? r.total_amount ?? 0) - monthlyRentContract) <= Math.max(5000, monthlyRentContract * 0.05);
            
            if (isPaid && monthlyRentContract > 0 && isFullRentReceipt) {
                ownerPart = monthlyRentContract * (1 - commissionRate / 100);
            } else if (ownerPart === 0) {
                ownerPart = (Number(r.amount_paid) || Number(r.total_amount) || 0) * (1 - commissionRate / 100);
            }
            return sum + ownerPart;
        }, 0) +
        manualTrans.reduce((sum, m) => {
            if (m.category !== 'rent_payment') return sum;
            const match = m.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
            if (match) return sum + Number(match[1]);
            const { commissionRate } = getContractInfo(undefined, m.related_property_id);
            return sum + (Number(m.amount) * (1 - commissionRate / 100));
        }, 0);

        const totalReversedSummary = ownerTrans.filter(r => r.type === 'debit').reduce((sum, r) => sum + Number(r.montant), 0);
        const globalBalanceSummary = totalAccumulatedSummary - totalReversedSummary;

        console.log('\n--- VUE 1 : OwnerRentSummary.tsx (Tableau de bord de performance) ---');
        console.log(`Total accumulé (Revenus net proprio) : ${totalAccumulatedSummary} FCFA`);
        console.log(`Total reversé (depuis owner_transactions) : ${totalReversedSummary} FCFA`);
        console.log(`Solde global calculé : ${globalBalanceSummary} FCFA`);

        // ----------------------------------------------------
        // LOGIQUE 2: PayoutModal.tsx (et caisse modal)
        // ----------------------------------------------------
        const earnedFromReceiptsPayout = receipts.reduce((sum, r) => {
            const { monthlyRentContract, commissionRate } = getContractInfo(r.contract_id, r.property_id);
            const ownerPart = Number(r.owner_payment) || ((Number(r.amount_paid ?? r.total_amount) || 0) * (1 - commissionRate / 100));
            return sum + ownerPart;
        }, 0);

        const earnedFromManualPayout = manualTrans.reduce((s, t) => {
            if (t.type === 'debit' || t.type === 'expense') return s; // (wait, is it debit/expense?)
            if (t.category === 'rent_payment') {
                const match = t.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
                if (match) return s + Number(match[1]);
                const { commissionRate } = getContractInfo(undefined, t.related_property_id);
                return s + (Number(t.amount) * (1 - commissionRate / 100));
            }
            return s;
        }, 0);

        const totalEarnedPayout = earnedFromReceiptsPayout + earnedFromManualPayout;

        // Note: let's inspect the types of modular transactions to see what type owner_payout has
        const payoutsWithDebit = manualTrans.filter(t => t.category === 'owner_payout' && t.type === 'debit');
        const payoutsWithExpense = manualTrans.filter(t => t.category === 'owner_payout' && t.type === 'expense');
        const payoutsWithDebitOrExpense = manualTrans.filter(t => t.category === 'owner_payout' && (t.type === 'debit' || t.type === 'expense'));

        const totalPaidOutDebitOnly = payoutsWithDebit.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalPaidOutExpenseOnly = payoutsWithExpense.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalPaidOutAll = payoutsWithDebitOrExpense.reduce((sum, t) => sum + Number(t.amount), 0);

        console.log('\n--- VUE 2 : PayoutModal.tsx (Fenetre de reversement) ---');
        console.log(`Revenus cumulés (earned) : ${totalEarnedPayout} FCFA`);
        console.log(`Reversements payés si type = 'debit' seulement : ${totalPaidOutDebitOnly} FCFA`);
        console.log(`Reversements payés si type = 'expense' seulement : ${totalPaidOutExpenseOnly} FCFA`);
        console.log(`Reversements payés si type = 'debit' OU 'expense' : ${totalPaidOutAll} FCFA`);
        console.log(`Solde si debit seulement : ${totalEarnedPayout - totalPaidOutDebitOnly}`);
        console.log(`Solde si debit ou expense : ${totalEarnedPayout - totalPaidOutAll}`);

        // ----------------------------------------------------
        // LOGIQUE 3: OwnerReversalCalculator.tsx
        // ----------------------------------------------------
        // let's check what transactions are generated
        console.log('\n--- VUE 3 : OwnerReversalCalculator.tsx (Calculateur de reversement) ---');
        const transactions = [];
        receipts.forEach(p => {
            const contract = contracts.find(c => c.id === p.contract_id || c.property_id === p.property_id);
            const contractRent = contract ? ((contract.monthly_rent || 0) + (contract.charges || 0)) : 0;
            const isPaid = p.payment_status === 'paid' || p.payment_status === 'full' || (p.amount_paid ?? p.total_amount) >= p.total_amount;
            
            let amount = p.amount_paid ?? p.total_amount;
            let comm = Number(p.commission_amount);
            let ownerPart = Number(p.owner_payment);
            
            if (isNaN(comm) || comm === 0 || isNaN(ownerPart) || ownerPart === 0) {
                const commRate = contract?.commission_rate !== undefined ? contract.commission_rate : 10;
                comm = (amount * commRate) / 100;
                ownerPart = amount - comm;
            }

            const isFullRentReceipt = Math.abs((p.amount_paid ?? p.total_amount ?? 0) - contractRent) <= Math.max(5000, contractRent * 0.05);
            if (isPaid && contractRent > 0 && isFullRentReceipt) {
                amount = contractRent;
                const commRate = contract?.commission_rate !== undefined ? contract.commission_rate : 10;
                comm = (amount * commRate) / 100;
                ownerPart = amount - comm;
            }
            
            transactions.push({ amount, commission: comm, ownerPart });
        });

        manualTrans.forEach(m => {
            if (m.category !== 'rent_payment') return;
            const match = m.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
            const contract = contracts.find(c => c.property_id === m.related_property_id);
            let ownerNet = 0;
            let comm = 0;
            
            if (match) {
                ownerNet = Number(match[1]);
                comm = Number(m.amount) - ownerNet;
            } else {
                const commRate = contract?.commission_rate !== undefined ? contract.commission_rate : 10;
                comm = (Number(m.amount) * commRate) / 100;
                ownerNet = Number(m.amount) - comm;
            }
            transactions.push({ amount: Number(m.amount), commission: comm, ownerPart: ownerNet });
        });

        const totalRentCalc = transactions.reduce((sum, t) => sum + t.amount, 0);
        const totalCommissionCalc = transactions.reduce((sum, t) => sum + t.commission, 0);
        const netAmountCalc = totalRentCalc - totalCommissionCalc;
        console.log(`Revenus brute total : ${totalRentCalc} FCFA`);
        console.log(`Commissions totales calculées : ${totalCommissionCalc} FCFA`);
        console.log(`Revenus net calculés : ${netAmountCalc} FCFA`);

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
