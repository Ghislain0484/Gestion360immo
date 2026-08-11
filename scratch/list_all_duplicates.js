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
        
        const dupRes = await client.query(`
            SELECT r.contract_id, r.period_month, r.period_year, COUNT(*) as cnt, t.first_name, t.last_name, p.title
            FROM public.rent_receipts r
            JOIN public.tenants t ON t.id = r.tenant_id
            JOIN public.properties p ON p.id = r.property_id
            GROUP BY r.contract_id, r.period_month, r.period_year, t.first_name, t.last_name, p.title
            HAVING COUNT(*) > 1;
        `);
        console.log('Tous les doublons de clés restants :');
        console.table(dupRes.rows);

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
