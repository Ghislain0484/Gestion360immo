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
        
        const dupRes = await client.query(`
            SELECT contract_id, period_month, period_year, COUNT(*) as cnt
            FROM public.rent_receipts
            GROUP BY contract_id, period_month, period_year
            HAVING COUNT(*) > 1;
        `);
        console.log('Doublons trouvés dans la base :');
        console.table(dupRes.rows);

        for (const row of dupRes.rows) {
            const receiptsRes = await client.query(`
                SELECT r.id, r.receipt_number, r.amount_paid, r.created_at, t.first_name, t.last_name, p.title
                FROM public.rent_receipts r
                JOIN public.tenants t ON t.id = r.tenant_id
                JOIN public.properties p ON p.id = r.property_id
                WHERE r.contract_id = $1 AND r.period_month = $2 AND r.period_year = $3
                ORDER BY r.created_at ASC;
            `, [row.contract_id, row.period_month, row.period_year]);
            console.log(`\nDétails des doublons pour le contrat ${row.contract_id} (${row.period_month}/${row.period_year}) :`);
            console.table(receiptsRes.rows);
        }

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
