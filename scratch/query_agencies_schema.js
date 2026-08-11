import pg from 'pg';

const connectionString = 'postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:5432/postgres';

async function queryAgenciesSchema() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database!');

    const resSchema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'agencies';
    `);
    console.log('Schema for agencies:');
    console.log(resSchema.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

queryAgenciesSchema();
