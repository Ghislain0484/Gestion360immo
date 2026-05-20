import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'db.jedknkbevxiyytsypjrv.supabase.co',
  port: 6543, // Transaction pooler or 5432
  user: 'postgres',
  password: 'Business@gestion360immo.com',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL Database successfully!');

    const sql = `
      -- 1. Ajouter les colonnes de reversement aux propriétaires
      ALTER TABLE public.owners 
      ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'retrait_physique',
      ADD COLUMN IF NOT EXISTS bank_name TEXT,
      ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
      ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
      ADD COLUMN IF NOT EXISTS bank_iban TEXT,
      ADD COLUMN IF NOT EXISTS bank_swift TEXT;
      
      -- 2. Accorder les droits d'accès
      GRANT ALL PRIVILEGES ON TABLE public.owners TO authenticated;
      GRANT ALL PRIVILEGES ON TABLE public.owners TO anon;
      GRANT ALL PRIVILEGES ON TABLE public.owners TO service_role;
    `;

    await client.query(sql);
    console.log('✅ Migration applied successfully! New bank details columns added to public.owners.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

main();
