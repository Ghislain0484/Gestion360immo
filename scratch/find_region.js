import https from 'https';

const ipAddress = '2a05:d012:42e:5718:a4cc:516f:90a1:4fe7';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function findRegion() {
  try {
    console.log('Querying ip-api.com (HTTPS) for IPv6 location...');
    const data = await fetchJSON(`https://demo.ip-api.com/json/${ipAddress}`);
    console.log('\n--- IP-API.COM RESULT ---');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error with ip-api.com:', err.message);
  }
}

findRegion();
