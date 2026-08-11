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
        
        console.log('--- COLUMNS OF PROPERTIES table ---');
        const { rows: cols } = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'properties' AND table_schema = 'public';
        `);
        console.log(cols.map(c => c.column_name));
        
        // Search for BIEN260608-00018 in any text column
        console.log('\nSearching for BIEN260608-00018...');
        const query = `
            SELECT id, title, monthly_rent, is_available, owner_id, 
                   COALESCE(business_id::text, '') as business_id
            FROM public.properties 
            WHERE title ILIKE '%BIEN260608-00018%' 
               OR (business_id IS NOT NULL AND business_id::text ILIKE '%BIEN260608-00018%')
               OR id::text ILIKE '%BIEN260608-00018%';
        `;
        const { rows: searchRes } = await client.query(query);
        console.log('Results:', searchRes);
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
