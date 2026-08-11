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
        
        await client.query('BEGIN;');

        // 1. Clean up Akande Flora Viviane pure duplicates in March 2026
        console.log('🗑️ Supprimant les doublons de Akande Flora Viviane (Mars 2026)...');
        const delFloraMarch = await client.query(`
            DELETE FROM public.rent_receipts 
            WHERE id IN ('70bb687d-934b-483c-a997-9182c2517b86', 'e2ca2aa4-47e5-4283-bea2-0ce8bb09d370');
        `);
        console.log(`Résultat : ${delFloraMarch.rowCount} lignes supprimées.`);

        // 2. Clean up Akande Flora Viviane pure duplicates in May 2026
        console.log('🗑️ Supprimant les doublons de Akande Flora Viviane (Mai 2026)...');
        const delFloraMay = await client.query(`
            DELETE FROM public.rent_receipts 
            WHERE id = '85afb6a6-5744-4f2b-b98f-b3518d23a081';
        `);
        console.log(`Résultat : ${delFloraMay.rowCount} lignes supprimées.`);

        // 3. Clean up Mahan Odette Bly duplicate in May 2026
        console.log('🗑️ Supprimant la quittance doublon (20 000) de Mahan Odette Bly (Mai 2026)...');
        const delBlyMay = await client.query(`
            DELETE FROM public.rent_receipts 
            WHERE id = '6e3a4696-926d-417d-8455-598fedc8e163';
        `);
        console.log(`Résultat : ${delBlyMay.rowCount} lignes supprimées.`);

        // 4. Consolidate Mahan Odette Bly main receipt in May 2026 to full amount (80 000)
        console.log('📝 Consolidant la quittance principale (50 000) de Mahan Odette Bly à 80 000 FCFA...');
        const updBlyMay = await client.query(`
            UPDATE public.rent_receipts 
            SET 
                rent_amount = 80000, 
                total_amount = 80000, 
                amount_paid = 80000, 
                balance_due = 0, 
                payment_status = 'full',
                commission_amount = 8000,
                owner_payment = 72000
            WHERE id = '9db128a9-4003-42ac-bb9b-bdcffd48971e';
        `);
        console.log(`Résultat : ${updBlyMay.rowCount} lignes mises à jour.`);

        await client.query('COMMIT;');
        console.log('🎉 Nettoyage de la base de données terminé avec succès !');

    } catch (err) {
        await client.query('ROLLBACK;');
        console.error('❌ Erreur et Rollback:', err);
    } finally {
        await client.end();
    }
}

run();
