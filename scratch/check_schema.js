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
        
        // 1. Columns of contracts table
        const contractsCols = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'contracts' AND table_schema = 'public';
        `);
        console.log('\n📋 Columns of table contracts:');
        console.table(contractsCols.rows);

        // 2. Policies on property_expenses and modular_transactions
        const policies = await client.query(`
            SELECT tablename, policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename IN ('property_expenses', 'modular_transactions');
        `);
        console.log('\n📋 Policies on property_expenses & modular_transactions:');
        console.table(policies.rows);

        // 3. Check table schema of modular_transactions if exists
        const modularCols = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'modular_transactions' AND table_schema = 'public';
        `);
        console.log('\n📋 Columns of table modular_transactions:');
        console.table(modularCols.rows);

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
