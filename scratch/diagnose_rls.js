import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected!");

        // 1. Get list of active policies on contracts and rent_receipts
        console.log("\n--- Policies on 'contracts' ---");
        const resContracts = await client.query(`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'contracts';
        `);
        console.log(JSON.stringify(resContracts.rows, null, 2));

        console.log("\n--- Policies on 'rent_receipts' ---");
        const resReceipts = await client.query(`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'rent_receipts';
        `);
        console.log(JSON.stringify(resReceipts.rows, null, 2));

        // 2. Also check active policies on other major tables to identify potential recursions
        console.log("\n--- Policies on 'properties' ---");
        const resProperties = await client.query(`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'properties';
        `);
        console.log(JSON.stringify(resProperties.rows, null, 2));

        console.log("\n--- Policies on 'owners' ---");
        const resOwners = await client.query(`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'owners';
        `);
        console.log(JSON.stringify(resOwners.rows, null, 2));

        console.log("\n--- Policies on 'users' ---");
        const resUsers = await client.query(`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'users';
        `);
        console.log(JSON.stringify(resUsers.rows, null, 2));

    } catch (err) {
        console.error("❌ Diagnostic failed:", err);
    } finally {
        await client.end();
    }
}

main();
