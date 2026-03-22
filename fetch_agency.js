
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAgency() {
  const { data, error } = await supabase.from('agencies').select('id, name').limit(1);
  if (error) console.error(error);
  else console.log(data);
}

getAgency();
