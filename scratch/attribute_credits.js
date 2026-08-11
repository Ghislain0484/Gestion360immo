import pg from 'pg';

const regions = [
  { name: 'Paris (eu-west-3)', host: 'aws-0-eu-west-3.pooler.supabase.com' },
  { name: 'Frankfurt (eu-central-1)', host: 'aws-0-eu-central-1.pooler.supabase.com' },
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

async function tryConnect(region) {
  const connectionString = `postgresql://postgres.jedknkbevxiyytsypjrv:Business%40gestion360immo.com@${region.host}:5432/postgres`;
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`Trying ${region.name} (${region.host})...`);
    await client.connect();
    console.log(`✅ SUCCESS! Connected to region ${region.name}!`);
    return client;
  } catch (err) {
    // If DNS doesn't exist, it prints ENOTFOUND
    if (err.message.includes('ENOTFOUND')) {
      console.log(`- DNS not available for ${region.name}`);
    } else {
      console.log(`❌ Rejected by ${region.name}: ${err.message}`);
    }
    try { await client.end(); } catch (e) {}
    return null;
  }
}

async function attributeCredits() {
  let client = null;
  for (const region of regions) {
    client = await tryConnect(region);
    if (client) break;
  }

  if (!client) {
    console.error('❌ Could not connect to any regional pooler.');
    return;
  }

  try {
    // 1. Ensure all existing agencies have a wallet
    console.log('Ensuring all agencies have wallets...');
    const ensureWalletsResult = await client.query(`
      INSERT INTO public.agency_wallets (agency_id, bonus_credits)
      SELECT id, 3
      FROM public.agencies
      ON CONFLICT (agency_id) DO NOTHING;
    `);
    console.log('Wallets ensured! Rows affected:', ensureWalletsResult.rowCount);

    // 2. Add 2 credits to every agency wallet
    console.log('Attributing 2 credits to all agency wallets...');
    const updateResult = await client.query(`
      UPDATE public.agency_wallets
      SET bonus_credits = COALESCE(bonus_credits, 0) + 2;
    `);
    console.log('Credits attributed successfully! Rows updated:', updateResult.rowCount);

    // 3. Log current credit balances
    const checkResult = await client.query(`
      SELECT aw.agency_id, a.name as agency_name, aw.bonus_credits, aw.balance
      FROM public.agency_wallets aw
      JOIN public.agencies a ON a.id = aw.agency_id;
    `);
    
    console.log('\n--- AGENCY CREDITS STATUS ---');
    checkResult.rows.forEach(row => {
      console.log(`Agency: ${row.agency_name} | Credits: ${row.bonus_credits} | Balance: ${row.balance} FCFA`);
    });

  } catch (err) {
    console.error('Error during database operation:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

attributeCredits();
