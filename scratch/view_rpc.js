import pkg from 'pg';
const { Client } = pkg;

const regions = [
  { name: 'Paris (eu-west-3)', host: 'aws-0-eu-west-3.pooler.supabase.com' },
  { name: 'Frankfurt (eu-central-1)', host: 'aws-0-eu-central-1.pooler.supabase.com' },
  { name: 'Frankfurt (eu-central-1) fallback', host: 'aws-0-eu-central-1.pooler.supabase.com' }
];

async function tryConnect(region) {
  const connectionString = `postgresql://postgres.jedknkbevxiyytsypjrv:Business%40gestion360immo.com@${region.host}:5432/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    return client;
  } catch (err) {
    try { await client.end(); } catch (e) {}
    return null;
  }
}

async function run() {
    let client = null;
    for (const region of regions) {
        client = await tryConnect(region);
        if (client) {
            break;
        }
    }

    if (!client) {
        console.error("❌ Could not connect to database.");
        return;
    }

    try {
        console.log("🔍 Querying definition of link_director_to_agency...");
        const res = await client.query(`
            SELECT pg_get_functiondef(p.oid) as def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'link_director_to_agency'
        `);

        if (res.rows.length === 0) {
            console.log("❌ link_director_to_agency function not found in public schema.");
        } else {
            console.log("\n--- FUNCTION DEFINITION ---");
            console.log(res.rows[0].def);
        }

    } catch (err) {
        console.error("❌ Error querying function:", err);
    } finally {
        await client.end();
    }
}

run();
