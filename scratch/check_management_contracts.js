import pg from 'pg';
import dns from 'dns';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const agencyId = '8561e4b6-0a47-47ba-9def-b2914885fedd'; // AGIM GROUP

const regions = [
  { name: 'Frankfurt (eu-central-1)', host: 'aws-0-eu-central-1.pooler.supabase.com' },
  { name: 'Paris (eu-west-3)', host: 'aws-0-eu-west-3.pooler.supabase.com' },
  { name: 'Ireland (eu-west-1)', host: 'aws-0-eu-west-1.pooler.supabase.com' },
  { name: 'London (eu-west-2)', host: 'aws-0-eu-west-2.pooler.supabase.com' },
  { name: 'Stockholm (eu-north-1)', host: 'aws-0-eu-north-1.pooler.supabase.com' },
  { name: 'Milan (eu-south-1)', host: 'aws-0-eu-south-1.pooler.supabase.com' },
  { name: 'Spain (eu-south-2)', host: 'aws-0-eu-south-2.pooler.supabase.com' },
  { name: 'N. Virginia (us-east-1)', host: 'aws-0-us-east-1.pooler.supabase.com' },
  { name: 'Ohio (us-east-2)', host: 'aws-0-us-east-2.pooler.supabase.com' },
  { name: 'N. California (us-west-1)', host: 'aws-0-us-west-1.pooler.supabase.com' },
  { name: 'Oregon (us-west-2)', host: 'aws-0-us-west-2.pooler.supabase.com' },
  { name: 'Canada (ca-central-1)', host: 'aws-0-ca-central-1.pooler.supabase.com' },
  { name: 'São Paulo (sa-east-1)', host: 'aws-0-sa-east-1.pooler.supabase.com' },
  { name: 'Singapore (ap-southeast-1)', host: 'aws-0-ap-southeast-1.pooler.supabase.com' },
  { name: 'Sydney (ap-southeast-2)', host: 'aws-0-ap-southeast-2.pooler.supabase.com' },
  { name: 'Tokyo (ap-northeast-1)', host: 'aws-0-ap-northeast-1.pooler.supabase.com' },
  { name: 'Seoul (ap-northeast-2)', host: 'aws-0-ap-northeast-2.pooler.supabase.com' },
  { name: 'Mumbai (ap-south-1)', host: 'aws-0-ap-south-1.pooler.supabase.com' },
  { name: 'Cape Town (af-south-1)', host: 'aws-0-af-south-1.pooler.supabase.com' }
];

function resolveHost(hostname) {
    return new Promise((resolve, reject) => {
        dns.lookup(hostname, { family: 4 }, (err, address) => {
            if (err) {
                reject(err);
            } else {
                resolve(address);
            }
        });
    });
}

async function tryConnect(region) {
  try {
    const ip = await resolveHost(region.host);
    console.log(`Trying ${region.name} (${ip})...`);
    for (const port of [6543, 5432]) {
        try {
            const connectionString = `postgresql://postgres.jedknkbevxiyytsypjrv:Business%40gestion360immo.com@${ip}:${port}/postgres`;
            const client = new pg.Client({
              connectionString,
              ssl: { rejectUnauthorized: false, servername: region.host }
            });
            await client.connect();
            return client;
        } catch (portErr) {
            if (portErr.message.includes('tenant/user') && portErr.message.includes('not found')) {
                // Not this region, quiet
            } else {
                console.log(`  -> Port ${port} on ${region.name} failed: ${portErr.message}`);
            }
        }
    }
    return null;
  } catch (err) {
    console.log(`  -> DNS lookup error for ${region.host}: ${err.message}`);
    return null;
  }
}

async function run() {
    console.log("🚀 Recherche du pooler régional actif via dns.lookup...");
    let client = null;
    for (const region of regions) {
        client = await tryConnect(region);
        if (client) {
            console.log(`✅ Connecté avec succès à la région : ${region.name} !`);
            break;
        }
    }

    if (!client) {
        console.error("❌ Impossible de se connecter à Supabase via aucun pooler régional.");
        return;
    }
    
    try {
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
        console.error('❌ Erreur:', err.message);
    } finally {
        await client.end();
    }
}

run();
