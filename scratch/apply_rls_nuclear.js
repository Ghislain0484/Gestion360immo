import pg from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    console.log("🚀 [RLS Nuclear Deploy] Connecting to database...");
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ [RLS Nuclear Deploy] Connected successfully!");

        console.log("📡 [RLS Nuclear Deploy] Reading SQL file...");
        const sqlPath = path.join(process.cwd(), 'scratch', 'fix_rls_nuclear_v3.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("📡 [RLS Nuclear Deploy] Executing nuclear RLS update...");
        const res = await client.query(sql);
        console.log("✅ [RLS Nuclear Deploy] Script executed successfully!");
        
        // Let's print out the final status
        const lastRow = res[res.length - 1];
        if (lastRow && lastRow.rows) {
            console.log("Status:", lastRow.rows[0]?.status);
        } else if (res.rows) {
            console.log("Status:", res.rows[0]?.status);
        }

    } catch (err) {
        console.error("❌ [RLS Nuclear Deploy] Deployment failed:", err);
    } finally {
        await client.end();
        console.log("🔌 [RLS Nuclear Deploy] Database connection closed.");
    }
}

main();
