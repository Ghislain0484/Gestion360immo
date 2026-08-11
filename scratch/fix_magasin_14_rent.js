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
        
        console.log("Correction du loyer pour le contrat de MAGASIN 14 (BIEN260608-00018)...");
        const res = await client.query(`
            UPDATE public.contracts 
            SET monthly_rent = 25000, 
                commission_amount = 2500 
            WHERE id = '2a9d4b3a-b058-464f-a129-f008d4b91899';
        `);
        console.log(`Lignes mises à jour : ${res.rowCount}`);
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
