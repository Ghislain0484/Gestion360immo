import fs from 'fs';
import path from 'path';

function findKeys(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findKeys(fullPath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Supabase anon keys are JWTs starting with eyJ
            const regex = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
            const matches = content.match(regex);
            if (matches) {
                console.log(`Found JWT key in ${file}:`);
                for (const match of matches) {
                    if (match.length > 50) {
                        console.log(match);
                    }
                }
            }
        }
    }
}

console.log('Searching for bundled keys in dist/ ...');
findKeys('./dist');
