
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://jedknkbevxiyytsypjrv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGtua2JldnhpeXl0c3lwanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzM0NzIsImV4cCI6MjA3MzI0OTQ3Mn0.uFtctOXUMOrxvgK2iLsdy2FSeO_C1uNNVfcMIh4sbIU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const agencyId = '3c46c864-0e69-4a24-ab09-39302cfc9ca3';

async function verify() {
  const { data, count, error } = await supabase
    .from('contracts')
    .select('property_id, monthly_rent, type', { count: 'exact' })
    .eq('agency_id', agencyId)
    .in('status', ['active', 'renewed']);
  
  const output = `Count: ${count}\nData Length: ${data.length}\nError: ${JSON.stringify(error)}\nTypes: ${JSON.stringify(data.map(d => d.type).reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {}))}`;
  fs.writeFileSync('tmp/verify.txt', output);
}

verify();
