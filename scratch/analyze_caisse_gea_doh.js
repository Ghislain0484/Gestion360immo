import pg from 'pg';
import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const hostname = 'db.jedknkbevxiyytsypjrv.supabase.co';
const agencyId = "96e00e23-e240-411e-bd20-95a15603f6cc"; // GEA-HOLDING SAU

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

async function run() {
  try {
    console.log('Resolving host ' + hostname + '...');
    const ip = await resolveHost(hostname);
    console.log('Resolved to IP:', ip);

    const connectionString = `postgresql://postgres:Business%40gestion360immo.com@${ip}:5432/postgres`;
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false, servername: hostname }
    });

    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    // 1. Get Agency details
    const agencyRes = await client.query('SELECT * FROM public.agencies WHERE id = $1', [agencyId]);
    if (agencyRes.rows.length === 0) {
        console.log('❌ Agence introuvable dans public.agencies!');
        const searchAgencies = await client.query('SELECT id, name FROM public.agencies WHERE name ILIKE $1', ['%GEA%']);
        console.log('Agencies matching GEA:', searchAgencies.rows);
        await client.end();
        return;
    }
    console.log(`\n🏢 Agence : ${agencyRes.rows[0].name} (ID: ${agencyId})`);

    // 2. Count receipts
    const receiptsRes = await client.query(
        'SELECT COALESCE(SUM(amount_paid), 0) as total_paid, COALESCE(SUM(total_amount), 0) as total_expected, COUNT(*) as count FROM public.rent_receipts WHERE agency_id = $1',
        [agencyId]
    );
    console.log(`\n📊 Quittances de Loyer (rent_receipts) pour cette agence :`);
    console.log(receiptsRes.rows[0]);

    // Let's print some receipts
    const sampleReceipts = await client.query(
        'SELECT id, receipt_number, rent_amount, amount_paid, payment_status, payment_date FROM public.rent_receipts WHERE agency_id = $1 LIMIT 10',
        [agencyId]
    );
    console.log('\nSample receipts:');
    console.table(sampleReceipts.rows);

    // 3. Count modular transactions
    const modularCount = await client.query(
        'SELECT COUNT(*) as count, type FROM public.modular_transactions WHERE agency_id = $1 GROUP BY type',
        [agencyId]
    );
    console.log('\n💸 Mouvements de caisse par type:');
    console.table(modularCount.rows);

    // Get current date context to check date range comparisons
    const dateQuery = await client.query('SELECT CURRENT_DATE, NOW()');
    console.log('\nDatabase time:', dateQuery.rows[0]);

    await client.end();
  } catch (err) {
    console.error('Error executing query:', err);
  }
}

run();
