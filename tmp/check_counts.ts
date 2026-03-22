
import { supabase } from '../src/lib/config';

async function checkContracts() {
  const { data: agencies, error: agError } = await supabase.from('agencies').select('id, name');
  if (agError) {
    console.err('Error fetching agencies:', agError);
    return;
  }

  console.log('Agencies found:', agencies.length);

  for (const agency of (agencies || [])) {
    const { count: total, error: tErr } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agency.id);
    
    const { count: active, error: aErr } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agency.id)
      .in('status', ['active', 'renewed']);

    console.log(`Agency: ${agency.name} (${agency.id})`);
    console.log(`  Total: ${total}`);
    console.log(`  Active/Renewed: ${active}`);
  }

  // Check for contracts without agency_id
  const { count: noAgency, error: naErr } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .is('agency_id', null);
  
  console.log(`Contracts without agency_id: ${noAgency}`);
}

checkContracts();
