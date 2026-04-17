
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function auditDB() {
  console.log('🔍 Starting Database Audit...');

  // 1. Check pending requests
  const { data: requests, error: reqError } = await supabase
    .from('agency_registration_requests')
    .select('*')
    .eq('status', 'pending');

  if (reqError) {
    console.error('❌ Error fetching requests:', reqError.message);
  } else {
    console.log(`✅ Found ${requests?.length || 0} pending requests.`);
    if (requests && requests.length > 0) {
      console.log('Sample request IDs:', requests.map(r => r.id));
    }
  }

  // 2. Audit Table Schema using RPC if available, or just simple selects
  console.log('\n🔍 Testing RPC approve_agency_request existence...');
  const { data: rpcTest, error: rpcError } = await supabase.rpc('approve_agency_request', { p_request_id: '00000000-0000-0000-0000-000000000000' });
  
  if (rpcError && rpcError.message.includes('not found')) {
      console.error('❌ RPC approve_agency_request NOT FOUND!');
  } else {
      console.log('✅ RPC approve_agency_request is defined.');
  }

  console.log('\n🚀 Audit complete.');
}

auditDB();
