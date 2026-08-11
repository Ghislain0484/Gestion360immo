import pg from 'pg';
import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
        https.get(`https://8.8.8.8/resolve?name=${hostname}&type=A`, {
            headers: { 'accept': 'application/dns-json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.Answer && json.Answer.length > 0) {
                        const aRecord = json.Answer.find(ans => ans.type === 1);
                        if (aRecord) {
                            resolve(aRecord.data);
                        } else {
                            reject(new Error("No A record in answer"));
                        }
                    } else {
                        reject(new Error("No answer"));
                    }
                } catch(e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function tryConnect(region) {
  try {
    const ip = await resolveHost(region.host);
    const connectionString = `postgresql://postgres.jedknkbevxiyytsypjrv:Business%40gestion360immo.com@${ip}:5432/postgres`;
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false, servername: region.host },
      connectionTimeoutMillis: 5000
    });

    await client.connect();
    return client;
  } catch (err) {
    console.log(`Failed to connect to ${region.name}: ${err.message}`);
    return null;
  }
}

async function run() {
    console.log("🚀 Testing all regions...");
    let client = null;
    for (const region of regions) {
        client = await tryConnect(region);
        if (client) {
            console.log(`✅ Connected to region : ${region.name}`);
            break;
        }
    }

    if (!client) {
        console.error("❌ Failed to connect to any regional pooler.");
        return;
    }
    
    try {
        const res = await client.query("SELECT agency_id, name, email, created_at FROM public.agencies WHERE name ILIKE '%AGIM%'");
        console.log("\n📋 Matching agencies:");
        console.table(res.rows);
    } catch (err) {
        console.error('❌ Query Error:', err.message);
    } finally {
        await client.end();
    }
}

run();
