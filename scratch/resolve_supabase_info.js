import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function resolveHost(hostname, type = 'A') {
    return new Promise((resolve) => {
        https.get(`https://8.8.8.8/resolve?name=${hostname}&type=${type}`, {
            headers: { 'accept': 'application/dns-json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch(e) { resolve({ error: e.message }); }
            });
        }).on('error', (err) => resolve({ error: err.message }));
    });
}

async function run() {
    console.log("--- db.jedknkbevxiyytsypjrv.supabase.co CNAME ---");
    console.log(JSON.stringify(await resolveHost('db.jedknkbevxiyytsypjrv.supabase.co', 'CNAME'), null, 2));

    console.log("\n--- db.jedknkbevxiyytsypjrv.supabase.co A ---");
    console.log(JSON.stringify(await resolveHost('db.jedknkbevxiyytsypjrv.supabase.co', 'A'), null, 2));

    console.log("\n--- jedknkbevxiyytsypjrv.supabase.co A ---");
    console.log(JSON.stringify(await resolveHost('jedknkbevxiyytsypjrv.supabase.co', 'A'), null, 2));
}

run();
