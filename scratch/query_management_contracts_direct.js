import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";
const agencyId = '8561e4b6-0a47-47ba-9def-b2914885fedd'; // AGIM GROUP

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('⚡ Connecté à PostgreSQL !');

        // Query all contracts of type gestion for AGIM GROUP
        const res = await client.query(`
            SELECT id, type, status, start_date, owner_id, tenant_id, property_id, created_at
            FROM public.contracts
            WHERE agency_id = $1 AND type = 'gestion'
            ORDER BY created_at DESC;
        `, [agencyId]);

        console.log(`\n📋 Contrats de gestion (Type = 'gestion') trouvés en base : ${res.rows.length}`);
        
        for (const row of res.rows) {
            console.log(`\nContrat ID: ${row.id}`);
            console.log(`- Status: ${row.status}`);
            console.log(`- Date Début: ${row.start_date}`);
            console.log(`- Owner ID: ${row.owner_id}`);
            console.log(`- Tenant ID: ${row.tenant_id}`);
            console.log(`- Property ID: ${row.property_id}`);
            
            // Check if owner exists
            if (row.owner_id) {
                const ownerRes = await client.query(`SELECT first_name, last_name FROM public.owners WHERE id = $1;`, [row.owner_id]);
                console.log(`  -> Owner exists: ${ownerRes.rows.length > 0 ? `${ownerRes.rows[0].first_name} ${ownerRes.rows[0].last_name}` : '❌ NON'}`);
            } else {
                console.log(`  -> Owner: null`);
            }

            // Check if property exists
            if (row.property_id) {
                const propRes = await client.query(`SELECT title FROM public.properties WHERE id = $1;`, [row.property_id]);
                console.log(`  -> Property exists: ${propRes.rows.length > 0 ? propRes.rows[0].title : '❌ NON'}`);
            } else {
                console.log(`  -> Property: null`);
            }
        }

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
