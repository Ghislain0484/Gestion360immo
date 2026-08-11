import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf-8').split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Manque VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    console.log('🔍 Diagnostiquant les commissions fintech et transactions...');
    
    // 1. Récupérer toutes les entrées de agency_fintech_fees
    const { data: fees, error: feesError } = await supabase
        .from('agency_fintech_fees')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (feesError) {
        console.error('❌ Erreur agency_fintech_fees:', feesError);
    } else {
        console.log(`\n📋 agency_fintech_fees (${fees ? fees.length : 0} entrées):`);
        fees?.forEach(f => {
            console.log(`- ID: ${f.id}, Agency: ${f.agency_id}, Period: ${f.period_month}, Revenue: ${f.potential_revenue}, Commission: ${f.commission_amount}, Status: ${f.status}, CreatedAt: ${f.created_at}, PaidAt: ${f.paid_at}, TxId: ${f.transaction_id}`);
        });
    }
    
    // 2. Récupérer les transactions wallet récentes
    const { data: txs, error: txsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
        
    if (txsError) {
        console.error('❌ Erreur wallet_transactions:', txsError);
    } else {
        console.log(`\n💸 wallet_transactions (${txs ? txs.length : 0} récentes):`);
        txs?.forEach(t => {
            console.log(`- ID: ${t.id}, Agency: ${t.agency_id}, Wallet: ${t.wallet_id}, Amount: ${t.amount}, Type: ${t.type}, Desc: ${t.description}, Ref: ${t.reference}, CreatedAt: ${t.created_at}`);
        });
    }
}

diagnose();
