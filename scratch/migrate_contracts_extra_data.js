import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('⚡ Connecté à PostgreSQL !');
        
        console.log('Ajout de la colonne extra_data à la table contracts...');
        await client.query(`
            ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS extra_data jsonb;
        `);
        console.log('✅ Colonne extra_data ajoutée avec succès !');

        // Verify again
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'extra_data';
        `);
        console.log('Verification:', res.rows);
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
