
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function approveAll() {
  console.log('🚀 Starting Mass Agency Approval...');

  // 1. Get all pending requests
  const { data: requests, error: fetchError } = await supabase
    .from('agency_registration_requests')
    .select('id, agency_name')
    .eq('status', 'pending');

  if (fetchError) {
    console.error('❌ Error fetching requests:', fetchError.message);
    return;
  }

  if (!requests || requests.length === 0) {
    console.log('✅ No pending requests found.');
    return;
  }

  console.log(`Found ${requests.length} pending requests. Processing...`);

  for (const req of requests) {
    console.log(`\n⏳ Approving: ${req.agency_name} (${req.id})...`);
    
    // Call the RPC
    const { data, error } = await supabase.rpc('approve_agency_request', {
      p_request_id: req.id
    });

    if (error) {
      console.error(`❌ FAILED for ${req.agency_name}:`, error.message);
      if (error.details) console.error(`   Details: ${error.details}`);
      if (error.hint) console.error(`   Hint: ${error.hint}`);
    } else {
      const result = data as any;
      if (result && result.success) {
        console.log(`✅ SUCCESS: Agency created with ID ${result.agency_id}`);
      } else {
        console.error(`❌ RPC returned failure: ${result?.error || 'Unknown error'}`);
      }
    }
  }

  console.log('\n🏁 Mass approval complete.');
}

approveAll();
