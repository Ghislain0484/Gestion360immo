import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({ 
        connectionString, 
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });
    try {
        await client.connect();
        console.log("✅ Connected!\n");

        console.log("Applying fix...");
        // Ensure platform_admins has a proper SELECT policy
        await client.query(`
            DROP POLICY IF EXISTS "Admins can read platform_admins" ON public.platform_admins;
            CREATE POLICY "Admins can read platform_admins"
            ON public.platform_admins
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
            
            -- Fix agency_registration_requests policy
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

    } catch(e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}
main();
