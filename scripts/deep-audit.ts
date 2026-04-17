
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function deepAudit() {
  console.log('🔍 Audit Profond de la structure Agencies...');

  // Utilisation de PostgREST pour deviner les colonnes
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ Impossible de lire directement agencies:', error.message);
  } else {
    console.log('✅ Colonnes détectées dans agencies:', Object.keys(data[0] || {}).join(', '));
  }

  // Vérification des requêtes en attente et de leurs données
  const { data: reqs } = await supabase
    .from('agency_registration_requests')
    .select('*')
    .eq('status', 'pending')
    .limit(1);

  if (reqs && reqs[0]) {
    console.log('📝 Données de la première demande:', JSON.stringify(reqs[0], null, 2));
  } else {
    console.log('❓ Aucune demande pending trouvée.');
  }
}

deepAudit();
