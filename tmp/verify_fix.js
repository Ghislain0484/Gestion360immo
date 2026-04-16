import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jedknkbevxiyytsypjrv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGtua2JldnhpeXl0c3lwanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzM0NzIsImV4cCI6MjA3MzI0OTQ3Mn0.uFtctOXUMOrxvgK2iLsdy2FSeO_C1uNNVfcMIh4sbIU');

const { data } = await supabase.from('contracts').select('id,monthly_rent,status').eq('id','c3a3b5d1-9e32-4174-b52b-6ea39c2272ac').single();
console.log('Vérification contrat Magasins 1:', data);

// Also check all 3 magasin contracts for this tenant
const { data: allContracts } = await supabase
  .from('contracts')
  .select('id, property_id, tenant_id, monthly_rent, status')
  .eq('tenant_id', 'aabda8c8-abf3-420c-9ea2-476a6139df5a')
  .in('status', ['active','renewed'])
  .eq('type', 'location');
console.log('\nTous les contrats du locataire (Gautier):');
allContracts?.forEach(c => console.log(`  property=${c.property_id} | loyer=${c.monthly_rent} FCFA`));
