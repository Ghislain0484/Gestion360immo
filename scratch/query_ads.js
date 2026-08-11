import pg from 'pg';

const connectionString = 'postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:5432/postgres';

async function queryAds() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database!');

    const res = await client.query(`
      SELECT * FROM collaboration_ads LIMIT 5;
    `);

    console.log('Sample ads:');
    console.log(JSON.stringify(res.rows, null, 2));

    const resSchema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'collaboration_ads';
    `);
    console.log('Schema for collaboration_ads:');
    console.log(resSchema.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

queryAds();
