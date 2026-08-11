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

    // List of files to apply
    const files = [
      'Optimize_Platform_Stats_V3.sql',
      'Fix_Platform_Admin_Creation_V2.sql'
    ];

    for (const file of files) {
      console.log(`Reading file ${file}...`);
      const filePath = path.resolve(file);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        continue;
      }
      
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Executing SQL from ${file}...`);
      await client.query(sql);
      console.log(`Successfully applied ${file}!`);
    }

  } catch (err) {
    console.error('Error applying SQL:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

applySQL();
