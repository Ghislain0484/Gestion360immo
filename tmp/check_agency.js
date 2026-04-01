const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDemoAgency() {
    console.log('Checking for Demo Agency (00000000-0000-0000-0000-000000000000)...');
    const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .maybeSingle();

    if (error) {
        console.error('Error checking agencies:', error);
    } else if (data) {
        console.log('✅ Demo Agency exists:', data.name);
    } else {
        console.log('❌ Demo Agency DOES NOT exist in the database.');
    }
}

checkDemoAgency();
