import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 
// Note: Usually we would need a SERVICE_ROLE_KEY for this, but if RLS allows or if we use the anon key in a specific way... 
// Actually, I'll just ask the user to run it if I can't. 
// BUT, I can try to use the anon key if RLS is not too strict for this update (unlikely).

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFix() {
    console.log('Searching for Agency "Général Immobilier"...');
    const { data: agency, error: searchError } = await supabase
        .from('agencies')
        .select('id')
        .ilike('name', '%Général Immobilier%')
        .limit(1)
        .single();

    if (searchError || !agency) {
        console.error('Agency not found or error:', searchError?.message);
        return;
    }

    console.log(`Found Agency ID: ${agency.id}. Updating to Enterprise...`);

    const { error: updateError } = await supabase
        .from('agencies')
        .update({
            plan_type: 'enterprise',
            monthly_fee: 100000,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
        })
        .eq('id', agency.id);

    if (updateError) {
        console.error('Error updating agencies table:', updateError.message);
        return;
    }

    const { error: subError } = await supabase
        .from('agency_subscriptions')
        .upsert({
            agency_id: agency.id,
            plan_type: 'enterprise',
            status: 'active',
            monthly_fee: 100000,
            next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'agency_id' });

    if (subError) {
        console.error('Error updating agency_subscriptions table:', subError.message);
        return;
    }

    console.log('✅ Successfully updated Général Immobilier to Enterprise (100,000 FCFA).');
}

runFix();
