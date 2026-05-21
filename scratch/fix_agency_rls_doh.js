import pg from 'pg';
import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function resolveHost(hostname) {
    return new Promise((resolve, reject) => {
        https.get(`https://8.8.8.8/resolve?name=${hostname}&type=A`, {
            headers: { 'accept': 'application/dns-json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.Answer && json.Answer.length > 0) {
                        resolve(json.Answer[0].data);
                    } else {
                        reject(new Error("No answer from 8.8.8.8: " + data));
                    }
                } catch(e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        const ip = await resolveHost('db.jedknkbevxiyytsypjrv.supabase.co');
        console.log(`Resolved IP: ${ip}`);

        const connectionString = `postgresql://postgres:Business%40gestion360immo.com@${ip}:6543/postgres`;

        const client = new pg.Client({ 
            connectionString, 
            ssl: { rejectUnauthorized: false, servername: 'db.jedknkbevxiyytsypjrv.supabase.co' },
            connectionTimeoutMillis: 10000
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
              is_platform_admin()
            );
        `);
        console.log("✅ Fix applied!");
        await client.end();
    } catch(e) {
        console.error("Error:", e.message);
    }
}
main();
