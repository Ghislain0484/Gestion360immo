import pkg from 'pg';
import fs from 'fs';
import path from 'path';
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
        
        const sqlPath = path.join(process.cwd(), 'Create_Owner_Loans.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('⏳ Exécution de la migration SQL...');
        await client.query(sql);
        console.log('✅ Migration SQL appliquée avec succès !');

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
