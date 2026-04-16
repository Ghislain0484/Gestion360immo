import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jedknkbevxiyytsypjrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGtua2JldnhpeXl0c3lwanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzM0NzIsImV4cCI6MjA3MzI0OTQ3Mn0.uFtctOXUMOrxvgK2iLsdy2FSeO_C1uNNVfcMIh4sbIU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    // Magasins 1 id = 8b9edf1d-e5b4-45e1-b2b2-e5e8e60a9db4 (confirmed from previous run, rent=50000)
    const MAGASINS1_ID = '8b9edf1d-e5b4-45e1-b2b2-e5e8e60a9db4';
    const CORRECT_RENT = 50000;

    console.log('🔍 Recherche des contrats actifs pour MAGASINS 1...');
    const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, property_id, tenant_id, monthly_rent, status, type, start_date')
        .eq('property_id', MAGASINS1_ID)
        .in('status', ['active', 'renewed'])
        .eq('type', 'location');

    if (error) { console.error('Erreur:', error); return; }
    console.log('Contrats trouvés:', contracts);

    if (!contracts || contracts.length === 0) {
        console.log('❌ Aucun contrat actif trouvé pour ce bien. Vérification sans filtre...');
        const { data: allContracts } = await supabase
            .from('contracts')
            .select('id, property_id, tenant_id, monthly_rent, status, type, start_date')
            .eq('property_id', MAGASINS1_ID);
        console.log('Tous les contrats:', allContracts);
        
        // Also dump contracts with monthly_rent 145000
        console.log('\n🔍 Recherche des contrats avec loyer 145000...');
        const { data: wrongRentContracts } = await supabase
            .from('contracts')
            .select('id, property_id, tenant_id, monthly_rent, status, type, start_date')
            .eq('monthly_rent', 145000)
            .in('status', ['active', 'renewed'])
            .eq('type', 'location');
        console.log('Contrats avec loyer 145000:', wrongRentContracts);
        return;
    }

    // Update any contract with wrong rent
    for (const contract of contracts) {
        console.log(`\n📋 Contrat ${contract.id}: loyer=${contract.monthly_rent} FCFA, date=${contract.start_date}`);
        if (contract.monthly_rent !== CORRECT_RENT) {
            console.log(`🔧 Correction: ${contract.monthly_rent} → ${CORRECT_RENT}...`);
            const { data: updated, error: upErr } = await supabase
                .from('contracts')
                .update({ monthly_rent: CORRECT_RENT, updated_at: new Date().toISOString() })
                .eq('id', contract.id)
                .select()
                .single();
            
            if (upErr) console.error('❌ Erreur:', upErr.message);
            else console.log(`✅ Corrigé! Nouveau loyer: ${updated.monthly_rent} FCFA`);
        } else {
            console.log(`✓ Loyer déjà correct: ${contract.monthly_rent} FCFA`);
        }
    }
    console.log('\n✅ Script terminé.');
}

fix().catch(console.error);
