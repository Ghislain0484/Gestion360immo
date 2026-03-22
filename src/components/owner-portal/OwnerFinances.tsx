import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, Download, TrendingUp, 
  FileText, Calendar, ArrowUpRight, DollarSign, Receipt
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoContext';
import { supabase } from '../../lib/config';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v ?? 0);

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

interface OwnerTransaction {
  id: string;
  date: string;
  type: 'receipt' | 'payout';
  amount: number;
  owner_net: number;
  reference: string;
  contract_id?: string;
  description: string;
}

export const OwnerFinances: React.FC = () => {
  const { owner } = useAuth();
  const { isDemoMode } = useDemoMode();
    const [receipts, setReceipts] = useState<any[]>([]);
    const [payouts, setPayouts] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'all' | '3m' | '6m' | '12m'>('12m');

  useEffect(() => {
    if (!owner?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          const { MOCK_CONTRACTS, MOCK_RECEIPTS, MOCK_TRANSACTIONS } = await import('../../lib/mockData');
          const demoOwnerId = 'demo-owner-1';
          
          const profileContracts = MOCK_CONTRACTS.filter(c => c.owner_id === demoOwnerId);
          const profileReceipts = MOCK_RECEIPTS.filter(r => r.owner_id === demoOwnerId);
          const profilePayouts = MOCK_TRANSACTIONS.filter(t => t.related_owner_id === demoOwnerId && t.category === 'owner_payout');

          setContracts(profileContracts);
          setReceipts(profileReceipts);
          setPayouts(profilePayouts);
          setLoading(false);
          return;
        }

        const { data: props } = await supabase.from('properties').select('id').eq('owner_id', owner.id);
        const propIds = (props || []).map((p: any) => p.id);

        if (propIds.length === 0) { setLoading(false); return; }

        const { data: ctrs } = await supabase
          .from('contracts')
          .select('id, monthly_rent, commission_rate, property_id, property:properties(title), tenant:tenants(first_name, last_name)')
          .in('property_id', propIds);

        const contractIds = (ctrs || []).map((c: any) => c.id);
        const { data: rcts } = contractIds.length > 0 ? await supabase
          .from('rent_receipts')
          .select('id, receipt_number, payment_date, total_amount, owner_payment, payment_status, contract_id, created_at')
          .in('contract_id', contractIds)
          .order('payment_date', { ascending: false }) : { data: [] };

        const { data: payoutsData } = await supabase
          .from('modular_transactions')
          .select('id, amount, transaction_date, description, payment_method, category, type')
          .eq('related_owner_id', owner.id)
          .eq('category', 'owner_payout')
          .eq('type', 'debit');

        setContracts(ctrs || []);
        setReceipts(rcts || []);
        setPayouts(payoutsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [owner?.id]);

  const allTransactions = useMemo<OwnerTransaction[]>(() => {
    const normalizedReceipts: OwnerTransaction[] = receipts.map(r => ({
      id: r.id,
      date: r.payment_date || r.created_at,
      type: 'receipt',
      amount: r.total_amount,
      owner_net: r.owner_payment,
      reference: r.receipt_number,
      contract_id: r.contract_id,
      description: 'Encaissement Loyer'
    }));

    const normalizedPayouts: OwnerTransaction[] = payouts.map(p => ({
      id: p.id,
      date: p.transaction_date,
      type: 'payout',
      amount: Number(p.amount),
      owner_net: Number(p.amount),
      reference: `REVERSEMENT-${p.id.slice(0,8).toUpperCase()}`,
      description: p.description || 'Reversement Agence'
    }));

    return [...normalizedReceipts, ...normalizedPayouts].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipts, payouts]);

  const filteredTransactions = useMemo(() => {
    const cutoff = period === 'all' ? null : new Date(Date.now() - parseInt(period) * 30 * 24 * 60 * 60 * 1000);
    const s = search.toLowerCase();
    return allTransactions.filter(t => {
      const isPayout = t.type === 'payout';
      const contract = !isPayout && t.contract_id ? contracts.find((c: any) => c.id === t.contract_id) : null;
      const matchSearch = (contract?.property?.title || '').toLowerCase().includes(s)
        || `${contract?.tenant?.first_name} ${contract?.tenant?.last_name}`.toLowerCase().includes(s)
        || (t.reference || '').toLowerCase().includes(s)
        || (t.description || '').toLowerCase().includes(s);
      const matchPeriod = !cutoff || new Date(t.date) >= cutoff;
      return matchSearch && matchPeriod;
    });
  }, [allTransactions, contracts, search, period]);

  const summary = useMemo(() => {
    const filterRecs = filteredTransactions.filter(t => t.type === 'receipt');
    const filterPayouts = filteredTransactions.filter(t => t.type === 'payout');
    
    const gross = filterRecs.reduce((s, r) => s + (r.amount || 0), 0);
    const netEarned = filterRecs.reduce((s, r) => s + (r.owner_net || 0), 0);
    const totalPaid = filterPayouts.reduce((s, p) => s + (p.amount || 0), 0);
    
    const commission = gross - netEarned;
    return { gross, netEarned, totalPaid, commission, count: filterRecs.length };
  }, [filteredTransactions]);

  const pieData = [
    { name: 'Gains Nets', value: summary.netEarned, color: '#10b981' },
    { name: 'Commission Agence', value: summary.commission, color: '#f59e0b' },
  ];

  if (loading) return (
    <div className="space-y-8 animate-pulse">
       <div className="h-12 bg-slate-200 rounded-2xl w-1/4" />
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[1,2,3].map(i => <div key={i} className="h-44 bg-slate-100 rounded-3xl" />)}
       </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analyse Financière</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Transparence totale sur vos revenus et frais de gestion</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            {[['12m', '1 an'], ['6m', '6 mois'], ['all', 'Tout']].map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v as any)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  period === v ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'
                }`}>
                {l}
              </button>
            ))}
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" /> Exporter PDF / Imprimer
          </button>
        </div>
      </div>

      {/* High-End KPI Cards & Chart Wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Stats Column */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
           <div className="sm:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8">
                 <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md">
                    <TrendingUp className="w-8 h-8 text-emerald-400" />
                 </div>
              </div>
               <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Total Reversé ({period === 'all' ? 'Indéfini' : period})</p>
               <p className="text-5xl font-black mb-4 tracking-tighter">{formatCurrency(summary.totalPaid)}</p>
               <div className="flex items-center gap-6 mt-8 pt-8 border-t border-white/5">
                  <div>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Gains Nets Attendus</p>
                     <p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.netEarned)}</p>
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Solde à percevoir</p>
                     <p className="text-xl font-bold text-indigo-400">{formatCurrency(summary.netEarned - summary.totalPaid)}</p>
                  </div>
               </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                 <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2 text-center sm:text-left">Loyer Brut Moyen</p>
                 <p className="text-3xl font-black text-slate-900 text-center sm:text-left">
                   {formatCurrency(summary.count > 0 ? summary.gross / summary.count : 0)}
                 </p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                 </div>
                 <p className="text-xs font-bold text-slate-400 italic">Valeur moyenne par transaction</p>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                 <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2 text-center sm:text-left">Efficacité Gestion</p>
                  <p className="text-3xl font-black text-indigo-600 text-center sm:text-left">
                    {summary.gross > 0 ? Math.round((summary.netEarned / summary.gross) * 100) : 0}%
                  </p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-3 text-emerald-600">
                 <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5" />
                 </div>
                 <p className="text-xs font-black uppercase tracking-widest">Part conservée</p>
              </div>
           </div>
        </div>

        {/* Breakdown Chart Column */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
           <h3 className="text-lg font-black text-slate-800 mb-8 self-start">Répartition des Frais</h3>
            <div className="w-full" style={{ height: 300, minHeight: 300 }}>
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(v) => formatCurrency(v as number)}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-8 space-y-4 w-full">
               <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-700">Part propriétaire après Frais</span>
                  <span className="font-black text-emerald-800">{Math.round(summary.netEarned/summary.gross*100) || 0}%</span>
               </div>
               <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <span className="text-xs font-bold text-amber-700">Commission Agence</span>
                  <span className="font-black text-amber-800">{Math.round(summary.commission/summary.gross*100) || 0}%</span>
               </div>
           </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center text-slate-900">
                <Receipt className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-black text-slate-800">Historique des Reversements</h2>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="Chercher une quittance..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-6">Référence</th>
                <th className="px-8 py-6">Date de Valeur</th>
                <th className="px-8 py-6">Libellé</th>
                <th className="px-8 py-6 text-right">Montant</th>
                <th className="px-8 py-6 text-right">Net Proprio</th>
                <th className="px-8 py-6 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-300">
                       <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                       <p className="text-sm font-bold">Aucune transaction enregistrée pour cette période</p>
                    </td>
                  </tr>
                ) : filteredTransactions.map((t, i) => {
                  const isPayout = t.type === 'payout';
                  const contract = !isPayout && t.contract_id ? contracts.find((c: any) => c.id === t.contract_id) : null;
                  
                  return (
                    <motion.tr 
                      key={t.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-slate-50 group transition-colors"
                    >
                      <td className="px-8 py-6">
                        <span className={`text-xs font-black px-3 py-1.5 rounded-lg transition-colors ${
                          isPayout ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-900'
                        }`}>
                          {t.reference}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                           <Calendar className="w-3 h-3" /> {formatDate(t.date)}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-800">{isPayout ? 'REVERSEMENT AGENCE' : (contract?.property?.title || 'Loyer Reçu')}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {isPayout ? t.description : `Loc: ${contract?.tenant?.first_name} ${contract?.tenant?.last_name}`}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right text-xs font-bold text-slate-400 tracking-tight">
                        {isPayout ? '-' : formatCurrency(t.amount)}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`text-sm font-black ${isPayout ? 'text-indigo-600' : 'text-emerald-600'}`}>
                          {isPayout ? '-' : ''}{formatCurrency(t.owner_net)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          isPayout ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {isPayout ? 'Versé' : 'Encaissé'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
