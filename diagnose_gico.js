
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Manque VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY dans .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    console.log('🔍 Diagnostic de l\'agence GICO 8KILOS...');
    
    // 1. Rechercher l'agence
    const { data: agencies, error: agencyError } = await supabase
        .from('agencies')
        .select('id, name, plan_type, monthly_fee, status, subscription_status')
        .ilike('name', '%GICO%');
    
    if (agencyError) {
        console.error('❌ Erreur lors de la recherche de l\'agence:', agencyError);
        return;
    }
    
    if (!agencies || agencies.length === 0) {
        console.log('❓ Aucune agence trouvée avec "GICO" dans le nom.');
        return;
    }
    
    for (const agency of agencies) {
        console.log(`\n🏢 Agence: ${agency.name} (ID: ${agency.id})`);
        console.log(`   Table agencies: plan_type=${agency.plan_type}, monthly_fee=${agency.monthly_fee}, subscription_status=${agency.subscription_status}`);
        
        // 2. Rechercher la souscription
        const { data: subs, error: subError } = await supabase
            .from('agency_subscriptions')
            .select('*')
            .eq('agency_id', agency.id);
            
        if (subError) {
            console.error(`   ❌ Erreur lors de la recherche de la souscription pour ${agency.id}:`, subError);
        } else if (!subs || subs.length === 0) {
            console.log('   ❓ Aucune souscription trouvée dans agency_subscriptions');
        } else {
            subs.forEach((sub, i) => {
                console.log(`   📋 Sub #${i+1}: plan_type=${sub.plan_type}, status=${sub.status}, monthly_fee=${sub.monthly_fee}, next_payment_date=${sub.next_payment_date}`);
            });
        }
        
        // 3. Compter les propriétés
        const { count, error: countError } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('agency_id', agency.id);
            
        if (countError) {
            console.error('   ❌ Erreur lors du comptage des propriétés:', countError);
        } else {
            console.log(`   🏠 Nombre de propriétés: ${count}`);
        }
    }
}

diagnose();
