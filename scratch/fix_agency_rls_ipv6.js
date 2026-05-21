import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
    try {
        const ip = '2a05:d012:42e:5718:a4cc:516f:90a1:4fe7';
        const connectionString = `postgresql://postgres:Business%40gestion360immo.com@[${ip}]:6543/postgres`;

        const client = new pg.Client({ 
            connectionString, 
            ssl: { rejectUnauthorized: false, servername: 'db.jedknkbevxiyytsypjrv.supabase.co' },
            connectionTimeoutMillis: 5000
        });

        await client.connect();
        console.log("✅ Connected!\n");

        console.log("Applying fix...");
        await client.query(`
            DROP POLICY IF EXISTS "Admins can read platform_admins" ON public.platform_admins;
            CREATE POLICY "Admins can read platform_admins"
            ON public.platform_admins
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
            
            DROP POLICY IF EXISTS "Allow platform admins to view all requests" ON public.agency_registration_requests;
            CREATE POLICY "Allow platform admins to view all requests" 
            ON public.agency_registration_requests 
            FOR ALL 
            TO authenticated 
            USING (
              EXISTS (
                SELECT 1 FROM public.platform_admins 
                WHERE user_id = auth.uid()
              )
            );
        `);
        console.log("✅ Fix applied!");
        await client.end();
    } catch(e) {
        console.error("Error:", e.message);
    }
}
main();
