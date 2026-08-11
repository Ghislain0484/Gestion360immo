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
        const propId = '4d3b2df8-9788-43ec-8109-d66b71509106';
        
        console.log('--- CONTRACTS FOR THIS PROPERTY ---');
        const { rows: contracts } = await client.query(
            `SELECT id, status, monthly_rent, charges, commission_rate, commission_amount, start_date, end_date, tenant_id FROM public.contracts WHERE property_id = $1;`,
            [propId]
        );
        console.log(contracts);
        
        if (contracts.length > 0) {
            const tenantId = contracts[0].tenant_id;
            console.log('\n--- TENANT DETAILS ---');
            const { rows: tenants } = await client.query(
                `SELECT id, first_name, last_name, business_id FROM public.tenants WHERE id = $1;`,
                [tenantId]
            );
            console.log(tenants);
        }
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
