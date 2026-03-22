
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://jedknkbevxiyytsypjrv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGtua2JldnhpeXl0c3lwanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzM0NzIsImV4cCI6MjA3MzI0OTQ3Mn0.uFtctOXUMOrxvgK2iLsdy2FSeO_C1uNNVfcMIh4sbIU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkContracts() {
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('agency_id, status, type');
  
  if (error) {
    fs.writeFileSync('tmp/results.txt', 'Error: ' + JSON.stringify(error));
    return;
  }

  const reports = {};
  contracts.forEach(c => {
    const aid = c.agency_id || 'null';
    if (!reports[aid]) reports[aid] = { total: 0, active: 0, location: 0 };
    reports[aid].total += 1;
    if (['active', 'renewed'].includes(c.status)) reports[aid].active += 1;
    if (c.type === 'location' && ['active', 'renewed'].includes(c.status)) reports[aid].location += 1;
  });

  let output = '--- FINAL REPORT ---\n';
  for (const aid in reports) {
    const r = reports[aid];
    output += `AID: ${aid} | Total: ${r.total} | Active: ${r.active} | Location: ${r.location}\n`;
  }
  fs.writeFileSync('tmp/results.txt', output);
  console.log('Results written to tmp/results.txt');
}

checkContracts();
