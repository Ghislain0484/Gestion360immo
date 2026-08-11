process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import https from 'https';

const hostname = 'db.jedknkbevxiyytsypjrv.supabase.co';

function resolveHostCloudflare(hostname) {
    return new Promise((resolve, reject) => {
        https.get(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, {
            headers: { 'accept': 'application/dns-json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.Answer && json.Answer.length > 0) {
                        const aRecord = json.Answer.find(ans => ans.type === 1);
                        if (aRecord) {
                            resolve(aRecord.data);
                        } else {
                            reject(new Error("No A record found in answers for: " + hostname));
                        }
                    } else {
                        reject(new Error("No answer from DNS API for: " + hostname));
                    }
                } catch(e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log('Resolving host ' + hostname + ' via Cloudflare DoH...');
        const ip = await resolveHostCloudflare(hostname);
        console.log('Resolved IP:', ip);
    } catch (err) {
        console.error('Error resolving:', err.message);
    }
}

run();
