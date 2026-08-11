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
        
        const agencyId = '96e00e23-e240-411e-bd20-95a15603f6cc';

        console.log('\n--- PROPERTIES COUNT ---');
        const propRes = await client.query(`SELECT count(*), count(owner_id) FROM public.properties WHERE agency_id = $1`, [agencyId]);
        console.log(propRes.rows[0]);

        console.log('\n--- TENANTS COUNT ---');
        const tenantRes = await client.query(`SELECT count(*) FROM public.tenants WHERE agency_id = $1`, [agencyId]);
        console.log(tenantRes.rows[0]);

        console.log('\n--- CONTRACTS COUNT ---');
        const contractRes = await client.query(`SELECT count(*), count(tenant_id), count(property_id) FROM public.contracts WHERE agency_id = $1`, [agencyId]);
        console.log(contractRes.rows[0]);

        console.log('\n--- SAMPLE CONTRACTS ---');
        const sampleContracts = await client.query(`
            SELECT id, tenant_id, property_id, start_date, status, monthly_rent
            FROM public.contracts 
            WHERE agency_id = $1 
            LIMIT 10;
        `, [agencyId]);
        console.log(JSON.stringify(sampleContracts.rows, null, 2));

        console.log('\n--- CASH TRANSACTIONS ---');
        const txRes = await client.query(`
            SELECT count(*), sum(amount) 
            FROM public.modular_transactions 
            WHERE agency_id = $1
        `, [agencyId]);
        console.log(txRes.rows[0]);

        console.log('\n--- CHECKS FOR NULL FOREIGN KEYS ---');
        const nullCheck = await client.query(`
            SELECT id, title, owner_id 
            FROM public.properties 
            WHERE agency_id = $1 AND (owner_id IS NULL OR title IS NULL)
        `, [agencyId]);
        console.log('Properties with null owner/title:', nullCheck.rows);

        const nullCheckContracts = await client.query(`
            SELECT id, tenant_id, property_id 
            FROM public.contracts 
            WHERE agency_id = $1 AND (tenant_id IS NULL OR property_id IS NULL)
        `, [agencyId]);
        console.log('Contracts with null tenant/property:', nullCheckContracts.rows);

        // Check if there is a wallet
        const walletRes = await client.query(`
            SELECT * FROM public.agency_wallets WHERE agency_id = $1
        `, [agencyId]);
        console.log('\n--- WALLET ---');
        console.log(walletRes.rows);

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
