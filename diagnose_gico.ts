
import { supabase } from './src/lib/config';

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
    }
}

diagnose();
