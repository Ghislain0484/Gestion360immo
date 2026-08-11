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
                        // Find the A record (type 1)
                        const aRecord = json.Answer.find(ans => ans.type === 1);
                        if (aRecord) {
                            resolve(aRecord.data);
                        } else {
                            reject(new Error("No A record found in answers for: " + hostname));
                        }
                    } else {
                        reject(new Error("No answer from DNS API for: " + hostname));
                    }
                } catch(e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function tryConnect(region) {
  try {
    const ip = await resolveHost(region.host);
    console.log(`Resolved ${region.name} (${region.host}) to IP: ${ip}`);
    
    // We connect to the regional pooler on port 5432
    const connectionString = `postgresql://postgres.jedknkbevxiyytsypjrv:Business%40gestion360immo.com@${ip}:5432/postgres`;
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false, servername: region.host }
    });

    await client.connect();
    return client;
  } catch (err) {
    // console.log(`Failed to connect to ${region.name}: ${err.message}`);
    return null;
  }
}

async function run() {
    console.log("🚀 Recherche du pooler régional actif via DoH et connexion à Supabase...");
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
        const corruptContractIds = [
            '77d23728-bb0f-4129-8d93-76d25cb5a1c4',
            '93f84d27-2435-4d83-8113-15266c21c93f',
            '50227410-63c3-43d1-91e1-eed65308dec0',
            'abcb1974-9fa9-4e90-a675-26065d5faa56',
            '421385ef-a335-4793-98b5-e4dcb86bbe99',
            '1d9f6315-1fd6-48e7-a82a-7a47922ae2e6',
            '746e5b4e-e552-4e8f-b93f-60a98fdb6837'
        ];

        console.log('\n--- CHECKING REFERENCES IN RENT RECEIPTS ---');
        const idsPlaceholder = corruptContractIds.map((_, i) => `$${i + 1}`).join(', ');
        const receiptsRes = await client.query(
            `SELECT id, contract_id FROM public.rent_receipts WHERE contract_id IN (${idsPlaceholder})`,
            corruptContractIds
        );
        console.log(`Nombre de quittances trouvées : ${receiptsRes.rows.length}`);
        console.log(receiptsRes.rows);

        console.log('\n--- CHECKING REFERENCES IN OTHER TABLES ---');
        const propertiesRes = await client.query(
            `SELECT id, title FROM public.properties WHERE id IN (SELECT property_id FROM public.contracts WHERE id IN (${idsPlaceholder}))`,
            corruptContractIds
        );
        console.log(`Propriétés liées : ${propertiesRes.rows.length}`);

        console.log('\n--- CLEANING UP ---');
        await client.query('BEGIN;');
        
        // Delete rent receipts if any exist (should be none, but let's be safe)
        if (receiptsRes.rows.length > 0) {
            const receiptIds = receiptsRes.rows.map(r => r.id);
            const receiptPlaceholders = receiptIds.map((_, i) => `$${i + 1}`).join(', ');
            await client.query(
                `DELETE FROM public.rent_receipts WHERE id IN (${receiptPlaceholders})`,
                receiptIds
            );
            console.log(`Supprimé ${receiptIds.length} quittances.`);
        }

        // Delete contracts
        const deleteContractsRes = await client.query(
            `DELETE FROM public.contracts WHERE id IN (${idsPlaceholder})`,
            corruptContractIds
        );
        console.log(`Supprimé ${deleteContractsRes.rowCount} contrats orphelins.`);

        await client.query('COMMIT;');
        console.log('🎉 Nettoyage réussi !');

    } catch (err) {
        await client.query('ROLLBACK;');
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
