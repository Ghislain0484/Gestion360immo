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
        
        console.log('--- INSPECTION DES CONTRATS POUR FRANCOIS TIGORI ---');
        
        const { rows: contracts } = await client.query(`
            SELECT c.id, c.status, c.start_date, c.end_date, c.monthly_rent, c.charges,
                   p.title as property_title,
                   t.first_name || ' ' || t.last_name as tenant_name
            FROM public.contracts c
            JOIN public.properties p ON c.property_id = p.id
            JOIN public.tenants t ON c.tenant_id = t.id
            WHERE p.owner_id = $1;
        `, [ownerId]);
        
        console.log(`Nombre total de contrats : ${contracts.length}`);
        contracts.forEach(c => {
            console.log(`- ID: ${c.id} | Status: ${c.status} | Bien: ${c.property_title} | Locataire: ${c.tenant_name} | Loyer: ${c.monthly_rent} | Début: ${c.start_date} | Fin: ${c.end_date}`);
        });

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
