
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkBusinessIds() {
  const tables = ['owners', 'tenants', 'properties'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('id, business_id', { count: 'exact' })
      .is('business_id', null);
      
    if (error) {
      console.error(`Error checking ${table}:`, error);
    } else {
      console.log(`${table}: ${count} missing business_id`);
    }
  }
}

checkBusinessIds();
