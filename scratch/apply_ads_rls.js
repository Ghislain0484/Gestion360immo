import pg from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:5432/postgres';

async function applySQL() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const file = 'Fix_Collaboration_Ads_RLS.sql';
    console.log(`Reading file ${file}...`);
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Executing SQL from ${file}...`);
    const res = await client.query(sql);
    console.log(`Successfully applied ${file}!`);
    console.log('Result:', res.rows || res);

  } catch (err) {
    console.error('Error applying SQL:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

applySQL();
