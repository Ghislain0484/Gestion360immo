import pkg from 'pg';
const { Client } = pkg;

const regions = [
  { name: 'Paris (eu-west-3)', host: 'aws-0-eu-west-3.pooler.supabase.com' },
  { name: 'Frankfurt (eu-central-1)', host: 'aws-0-eu-central-1.pooler.supabase.com' },
  { name: 'Ireland (eu-west-1)', host: 'aws-0-eu-west-1.pooler.supabase.com' },
  { name: 'London (eu-west-2)', host: 'aws-0-eu-west-2.pooler.supabase.com' },
  { name: 'Stockholm (eu-north-1)', host: 'aws-0-eu-north-1.pooler.supabase.com' },
  { name: 'Milan (eu-south-1)', host: 'aws-0-eu-south-1.pooler.supabase.com' },
  { name: 'Spain (eu-south-2)', host: 'aws-0-eu-south-2.pooler.supabase.com' },
  
  { name: 'N. Virginia (us-east-1)', host: 'aws-0-us-east-1.pooler.supabase.com' },
  { name: 'Ohio (us-east-2)', host: 'aws-0-us-east-2.pooler.supabase.com' },
  { name: 'N. California (us-west-1)', host: 'aws-0-us-west-1.pooler.supabase.com' },
  { name: 'Oregon (us-west-2)', host: 'aws-0-us-west-2.pooler.supabase.com' },
  { name: 'Canada (ca-central-1)', host: 'aws-0-ca-central-1.pooler.supabase.com' },
  { name: 'São Paulo (sa-east-1)', host: 'aws-0-sa-east-1.pooler.supabase.com' },
  
  { name: 'Singapore (ap-southeast-1)', host: 'aws-0-ap-southeast-1.pooler.supabase.com' },
  { name: 'Sydney (ap-southeast-2)', host: 'aws-0-ap-southeast-2.pooler.supabase.com' },
  { name: 'Tokyo (ap-northeast-1)', host: 'aws-0-ap-northeast-1.pooler.supabase.com' },
  { name: 'Seoul (ap-northeast-2)', host: 'aws-0-ap-northeast-2.pooler.supabase.com' },
  { name: 'Mumbai (ap-south-1)', host: 'aws-0-ap-south-1.pooler.supabase.com' },
  
  { name: 'Cape Town (af-south-1)', host: 'aws-0-af-south-1.pooler.supabase.com' }
];

async function tryConnect(region) {
  const connectionString = `postgresql://postgres.jedknkbevxiyytsypjrv:Business%40gestion360immo.com@${region.host}:5432/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    return client;
  } catch (err) {
    try { await client.end(); } catch (e) {}
    return null;
  }
}

async function run() {
    console.log("🚀 Recherche du pooler régional actif et connexion à Supabase...");
    let client = null;
    for (const region of regions) {
        client = await tryConnect(region);
        if (client) {
            console.log(`✅ Connecté avec succès à la région : ${region.name} !`);
            break;
        }
    }

    if (!client) {
        console.error("❌ Impossible de se connecter à Supabase via aucun pooler régional.");
        return;
    }

    try {
        const email = 'giselealla@gicosarl.net';

        console.log(`\n🔍 1. Recherche dans auth.users pour '${email}'...`);
        const resAuth = await client.query(
            "SELECT id, email, confirmed_at, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, banned_until, deleted_at, encrypted_password FROM auth.users WHERE LOWER(email) = LOWER($1)",
            [email]
        );

        if (resAuth.rows.length === 0) {
            console.log("❌ Utilisateur INTROUVABLE dans auth.users !");
        } else {
            const row = resAuth.rows[0];
            console.log("✅ Trouvé dans auth.users :");
            console.log(`   - ID : ${row.id}`);
            console.log(`   - Email : ${row.email}`);
            console.log(`   - Confirmed At : ${row.confirmed_at}`);
            console.log(`   - Email Confirmed At : ${row.email_confirmed_at}`);
            console.log(`   - Last Sign In : ${row.last_sign_in_at}`);
            console.log(`   - Banned Until : ${row.banned_until}`);
            console.log(`   - Deleted At : ${row.deleted_at}`);
            console.log(`   - Password Hash présent : ${row.encrypted_password ? "Oui" : "Non"}`);
            console.log("   - Raw App Meta Data :", JSON.stringify(row.raw_app_meta_data));
            console.log("   - Raw User Meta Data :", JSON.stringify(row.raw_user_meta_data));
        }

        console.log(`\n🔍 2. Recherche dans public.users pour '${email}'...`);
        const resPublic = await client.query(
            "SELECT id, email, first_name, last_name, is_active, permissions FROM public.users WHERE LOWER(email) = LOWER($1)",
            [email]
        );

        if (resPublic.rows.length === 0) {
            console.log("❌ Utilisateur INTROUVABLE dans public.users !");
        } else {
            const row = resPublic.rows[0];
            console.log("✅ Trouvé dans public.users :");
            console.log(`   - ID : ${row.id}`);
            console.log(`   - Nom : ${row.first_name} ${row.last_name}`);
            console.log(`   - Actif : ${row.is_active}`);
            console.log("   - Permissions :", JSON.stringify(row.permissions));
        }

        console.log(`\n🔍 3. Recherche des liaisons d'agence dans public.agency_users...`);
        const resAgency = await client.query(
            `SELECT au.user_id, au.agency_id, au.role, a.name AS agency_name, a.status AS agency_status
             FROM public.agency_users au
             JOIN public.agencies a ON au.agency_id = a.id
             WHERE au.user_id IN (SELECT id FROM public.users WHERE LOWER(email) = LOWER($1))`,
            [email]
        );

        if (resAgency.rows.length === 0) {
            console.log("❌ Aucune liaison d'agence trouvée dans public.agency_users !");
        } else {
            console.log("✅ Liaison(s) trouvée(s) :");
            resAgency.rows.forEach((row, i) => {
                console.log(`   #${i + 1} :`);
                console.log(`     - Agence : ${row.agency_name} (ID: ${row.agency_id})`);
                console.log(`     - Rôle : ${row.role}`);
                console.log(`     - Statut Agence : ${row.agency_status}`);
            });
        }

    } catch (err) {
        console.error("❌ Erreur pendant le diagnostic :", err);
    } finally {
        await client.end();
        console.log("\n🔌 Déconnecté.");
    }
}

run();
