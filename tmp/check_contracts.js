import { supabase } from '../src/lib/config';

async function check() {
  const { data, error } = await supabase.from('contracts').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}

check();
