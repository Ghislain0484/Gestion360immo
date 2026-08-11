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

        const ids = [
            'ca1d877f-a761-4374-a54c-99b078fc4c78', // Mme Kassoum
            '60601cf4-3f5c-44af-a68a-f8305ee3293f'  // Ghislain Bohoo
        ];

        for (const id of ids) {
            const res = await client.query(`
                SELECT * FROM public.rent_receipts WHERE id = $1;
            `, [id]);
            console.log(`\n🔍 Receipt ID: ${id}`);
            console.dir(res.rows[0], { depth: null });
        }

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await client.end();
    }
}

run();
