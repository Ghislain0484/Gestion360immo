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
        
        console.log('--- ANALYSIS OF RENT RECEIPTS FOR FRANCOIS TIGORI ---');
        
        const { rows: receipts } = await client.query(`
            SELECT id, payment_status, total_amount, amount_paid, owner_payment, contract_id, property_id 
            FROM public.rent_receipts 
            WHERE owner_id = $1;
        `, [ownerId]);
        
        console.log(`Nombre total de quittances : ${receipts.length}`);
        
        let countPaid = 0;
        let countPartial = 0;
        let countUnpaid = 0;
        let sumTotalAmount = 0;
        let sumAmountPaid = 0;
        let sumOwnerPaymentOfPaid = 0; // sum of owner_payment for paid receipts
        let sumDynamicOwnerPart = 0; // calculated owner share based on actually paid amounts
        
        // Fetch contracts to get commission rates
        const { rows: contracts } = await client.query(`SELECT id, property_id, commission_rate FROM public.contracts;`);
        
        const getContractInfo = (contractId, propertyId) => {
            let contract = null;
            if (contractId) {
                contract = contracts.find(c => c.id === contractId);
            }
            if (!contract && propertyId) {
                contract = contracts.find(c => c.property_id === propertyId);
            }
            const commissionRate = contract?.commission_rate !== undefined ? Number(contract.commission_rate) : 10;
            return { commissionRate };
        };

        for (const r of receipts) {
            const status = r.payment_status;
            const total = Number(r.total_amount) || 0;
            const paid = Number(r.amount_paid) || 0;
            const ownerPayment = Number(r.owner_payment) || 0;
            const { commissionRate } = getContractInfo(r.contract_id, r.property_id);
            
            sumTotalAmount += total;
            
            if (status === 'paid' || status === 'full' || paid >= total) {
                countPaid++;
                sumAmountPaid += total; // full amount paid
                const op = ownerPayment || (total * (1 - commissionRate / 100));
                sumOwnerPaymentOfPaid += op;
                sumDynamicOwnerPart += op;
            } else if (status === 'partial' || (paid > 0 && paid < total)) {
                countPartial++;
                sumAmountPaid += paid;
                const op = ownerPayment || (paid * (1 - commissionRate / 100));
                sumDynamicOwnerPart += op;
            } else {
                countUnpaid++;
                // Unpaid: nothing actually collected!
            }
        }
        
        console.log(`- Payées : ${countPaid}`);
        
        console.log(`- Partielles : ${countPartial}`);
        console.log(`- Impayées : ${countUnpaid}`);
        console.log(`- Total attendu (facturé) : ${sumTotalAmount} FCFA`);
        console.log(`- Total encaissé (payé par locataires) : ${sumAmountPaid} FCFA`);
        console.log(`- Part propriétaire cumulée (sur montant réellement encaissé) : ${sumDynamicOwnerPart} FCFA`);
        
        const { rows: ownerTrans } = await client.query(
            `SELECT SUM(montant) as total_reversed FROM public.owner_transactions WHERE owner_id = $1;`,
            [ownerId]
        );
        const totalReversed = Number(ownerTrans[0].total_reversed) || 0;
        console.log(`- Total reversé au propriétaire : ${totalReversed} FCFA`);
        console.log(`- Bilan (Part Proprio Encaissée - Reversé) : ${sumDynamicOwnerPart - totalReversed} FCFA`);
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
