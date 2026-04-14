import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, Search, MapPin, AlertTriangle, 
  CheckCircle2, MessageSquare,
  TrendingUp, Calendar, ShieldCheck, X,
  CreditCard, Clock, MailIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoContext';
import { supabase } from '../../lib/config';
import { motion, AnimatePresence } from 'framer-motion';

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v ?? 0);

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export const OwnerTenants: React.FC = () => {
  const { owner } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'late' | 'ok'>('all');
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  useEffect(() => {
    if (!owner?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          const { MOCK_CONTRACTS, MOCK_RECEIPTS } = await import('../../lib/mockData');
          const demoOwnerId = 'demo-owner-1';
          
          const profileContracts = MOCK_CONTRACTS.filter(c => (c.owner_id === demoOwnerId) && (c.status === 'active' || c.status === 'renewed'));
          const contractIds = profileContracts.map(c => c.id);
          const profileReceipts = MOCK_RECEIPTS.filter(r => contractIds.includes(r.contract_id));

          const enriched = profileContracts.map(c => {
            const relReceipts = profileReceipts.filter(r => r.contract_id === c.id);
            const totalPaidRent = relReceipts.reduce((sum, r) => sum + (r.rent_amount || r.total_amount || 0), 0);
            const totalCaution = relReceipts.reduce((sum, r) => sum + (r.deposit_amount || 0), 0);
            const monthlyTotal = (c.monthly_rent || 0) + (c.charges || 0);
            const monthsCovered = monthlyTotal > 0 ? totalPaidRent / monthlyTotal : 0;
            const start = new Date(c.start_date);
            const now = new Date();
            const elapsedMonths = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
            const financialBalance = monthsCovered - elapsedMonths;
            const status = financialBalance >= 0.1 ? 'advance' : (financialBalance < -0.33 ? 'late' : 'ok');

            return { 
              ...c, 
              receipts: relReceipts, 
              totalPaid: totalPaidRent, 
              totalCaution,
              monthsCovered, 
              elapsedMonths,
              financialBalance,
              financialStatus: status
            };
          });

          setData(enriched);
          setLoading(false);
          return;
        }
        const { data: props } = await supabase.from('properties').select('id').eq('owner_id', owner.id);
        const propIds = (props || []).map((p: any) => p.id);

        if (propIds.length === 0) { setLoading(false); return; }

        const { data: contracts } = await supabase
          .from('contracts')
          .select(`
            id, monthly_rent, charges, commission_rate, start_date, end_date, next_payment_date, status,
            property:properties(id, title, location),
            tenant:tenants(id, first_name, last_name, phone, email, address)
          `)
          .in('property_id', propIds)
          .in('status', ['active', 'renewed']);

        if (contracts && contracts.length > 0) {
          const contractIds = contracts.map(c => c.id);
          const { data: receipts } = await supabase
            .from('rent_receipts')
            .select('*')
            .in('contract_id', contractIds)
            .order('payment_date', { ascending: false });

          const enriched = contracts.map(c => {
            const relReceipts = (receipts || []).filter(r => r.contract_id === c.id);
            
            // Calcul pro: On ne compte que la part LOYER + CHARGES pour la couverture
            const totalPaidRent = relReceipts.reduce((sum, r) => 
               sum + (r.rent_amount || 0) + (r.charges || 0), 0);
            
            const totalCaution = relReceipts.reduce((sum, r) => sum + (r.deposit_amount || 0), 0);
            
            const monthlyTotal = (c.monthly_rent || 0) + (c.charges || 0);
            const monthsCovered = monthlyTotal > 0 ? totalPaidRent / monthlyTotal : 0;
            
            // Current occupancy duration
            const start = new Date(c.start_date);
            const now = new Date();
            const elapsedMonths = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
            
            const financialBalance = monthsCovered - elapsedMonths;
            
            // Expert Logic for Status: 
            // - Advance: > 3 days ahead (0.1m)
            // - Late: < -15 days (-0.5m) OR (< -5 days AND tenure > 1 week)
            const isVeryNew = elapsedMonths < 0.25; // Less than a week
            const isLate = financialBalance < -0.5 || (financialBalance < -0.16 && !isVeryNew);
            const status = financialBalance >= 0.1 ? 'advance' : isLate ? 'late' : 'ok';

            return { 
              ...c, 
              receipts: relReceipts, 
              totalPaid: totalPaidRent, 
              totalCaution,
              monthsCovered, 
              elapsedMonths,
              financialBalance,
              financialStatus: status
            };
          });
          setData(enriched);
        } else {
          setData([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [owner?.id]);

  const enrichedList = useMemo(() => {
    const now = new Date();
    return data.map(c => {
      const isLate = c.financialStatus === 'late';
      const daysLate = c.financialBalance < 0 ? Math.abs(Math.floor(c.financialBalance * 30.44)) : 0;
      
      const start = new Date(c.start_date);
      const tenureMonths = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
      
      const leaseDuration = c.end_date 
        ? Math.floor((new Date(c.end_date).getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        : null;
      
      return { ...c, isLate, daysLate, tenureMonths, leaseDuration };
    });
  }, [data]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return enrichedList.filter(c => {
      const name = `${c.tenant?.first_name} ${c.tenant?.last_name}`.toLowerCase();
      const prop = (c.property?.title || '').toLowerCase();
      const matchSearch = name.includes(s) || prop.includes(s) || (c.tenant?.phone || '').includes(s);
      const matchFilter = filter === 'all' || (filter === 'late' && c.isLate) || (filter === 'ok' && !c.isLate);
      return matchSearch && matchFilter;
    });
  }, [enrichedList, search, filter]);

  if (loading) return (
     <div className="space-y-8 animate-pulse">
        <div className="h-12 bg-slate-200 rounded-2xl w-1/4" />
        <div className="space-y-6">
           {[1,2,3].map(i => <div key={i} className="h-56 bg-slate-100 rounded-[3rem]" />)}
        </div>
     </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestion Locataires</h1>
          <p className="text-slate-500 mt-1 font-medium">Suivi de la ponctualité et de l'occupation de vos biens</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input
              type="text"
              placeholder="Chercher un occupant ou un bien..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
            />
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            {[['all','Tous'], ['ok','À jour'], ['late','Retards']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v as any)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === v ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filtered.map((c, i) => (
          <motion.div 
            key={c.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white rounded-[3rem] shadow-sm border overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 ${
              c.isLate ? 'border-rose-100' : 'border-slate-100'
            }`}
          >
            <div className="p-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-slate-900/20">
                      {c.tenant?.first_name?.[0]}{c.tenant?.last_name?.[0]}
                    </div>
                    {c.isLate ? (
                       <div className="absolute -top-3 -right-3 w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                          <AlertTriangle className="w-5 h-5 text-white" />
                       </div>
                    ) : (
                       <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                          <ShieldCheck className="w-5 h-5 text-white" />
                       </div>
                    )}
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                       {c.tenant?.first_name} {c.tenant?.last_name}
                     </h3>
                     <p className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest mt-3">
                       <MapPin className="w-4 h-4 text-emerald-500" /> {c.property?.title}
                     </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-8">
                   <div className="bg-slate-50 px-8 py-5 rounded-[2rem] border border-slate-100 min-w-[140px]">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Couverture</p>
                      <p className="text-xl font-black text-slate-800 text-center">{c.monthsCovered.toFixed(1)} mois</p>
                      <div className="mt-2 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-emerald-500 rounded-full" 
                           style={{ width: `${Math.min(100, (c.monthsCovered / Math.max(1, c.tenureMonths)) * 100)}%` }} 
                         />
                      </div>
                   </div>
                   <div className={`px-8 py-5 rounded-[2rem] border min-w-[140px] ${
                     c.financialStatus === 'late' ? 'bg-rose-50 border-rose-100 text-rose-600' : 
                     c.financialStatus === 'advance' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                     'bg-blue-50 border-blue-100 text-blue-600'
                   }`}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-center">Statut Financier</p>
                      <p className="text-xl font-black text-center">
                        {c.financialStatus === 'late' ? `Retard ${c.daysLate}j` : 
                         c.financialStatus === 'advance' ? `Avance +${c.financialBalance.toFixed(1)}m` : 
                         'À jour'}
                      </p>
                   </div>
                   <div className="bg-slate-900 px-8 py-5 rounded-[2rem] text-white shadow-xl shadow-slate-900/20 min-w-[140px]">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Loyer Net</p>
                      <p className="text-xl font-black text-center">{formatCurrency(c.monthly_rent * (1 - (c.commission_rate || 10)/100))}</p>
                   </div>
                </div>

                {/* Actions Button */}
                <div className="flex gap-4">
                   <button 
                     onClick={() => alert("Demande de mise en relation envoyée à votre gestionnaire.")}
                     className="px-6 py-4 bg-white border border-slate-200 rounded-3xl flex items-center gap-3 text-slate-500 hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-widest"
                   >
                      <MessageSquare className="w-5 h-5 text-emerald-500" /> Contacter l'agence
                   </button>
                   <button 
                     onClick={() => setSelectedTenant(c)}
                     className="h-14 px-10 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                   >
                      Dossier Complet
                   </button>
                </div>
              </div>

              <div className="mt-10 pt-10 border-t border-slate-50 grid grid-cols-1 md:grid-cols-5 gap-8">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Période du Bail</p>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                       <Calendar className="w-4 h-4" /> {formatDate(c.start_date)} — {c.end_date ? formatDate(c.end_date) : 'Indéterminé'}
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Durée du Bail</p>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                       <Clock className="w-4 h-4" /> {c.leaseDuration ? `${c.leaseDuration} mois` : 'Non spécifiée'}
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center md:text-left">Dernière Quittance</p>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold text-emerald-600">
                       <CheckCircle2 className="w-4 h-4" /> Validée & Reversée
                    </div>
                 </div>
                 <div className="md:col-span-2 flex items-center justify-end">
                    <div className="flex items-center gap-4 text-xs font-black text-slate-300 uppercase tracking-[0.2em]">
                       <TrendingUp className="w-4 h-4" /> Performance locative validée par l'agence
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Aucun locataire trouvé</h3>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTenant(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-950 shrink-0">
                <button 
                  onClick={() => setSelectedTenant(null)}
                  className="absolute top-8 right-8 w-12 h-12 bg-white/10 backdrop-blur-md hover:bg-white text-white hover:text-slate-900 rounded-2xl flex items-center justify-center transition-all z-10"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="absolute -bottom-12 left-12 flex items-end gap-6">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-white p-2 shadow-2xl">
                    <div className="w-full h-full rounded-[2rem] bg-emerald-500 flex items-center justify-center text-white text-4xl font-black">
                      {selectedTenant.tenant?.first_name?.[0]}{selectedTenant.tenant?.last_name?.[0]}
                    </div>
                  </div>
                  <div className="mb-4 text-white">
                     <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-2">Profil Locataire</p>
                     <h2 className="text-3xl font-black tracking-tight">{selectedTenant.tenant?.first_name} {selectedTenant.tenant?.last_name}</h2>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pt-20 px-12 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-10">
                    <section>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 py-2 border-b border-slate-50">Gestion & Relation</h3>
                      <div className="space-y-4">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-sm font-bold text-slate-800 mb-2 leading-tight">La mise en relation directe est gérée par l'agence.</p>
                           <p className="text-xs text-slate-500 mb-6">Pour toute communication ou demande spécifique concernant ce locataire, veuillez passer par votre gestionnaire dédié.</p>
                           <button 
                             onClick={() => alert("Demande transmise au gestionnaire.")}
                             className="w-full py-4 bg-white border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-3"
                           >
                             <MailIcon className="w-4 h-4" /> Contacter le gestionnaire
                           </button>
                        </div>
                      </div>
                    </section>

                    <section>
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 py-2 border-b border-slate-50">Score Locatif</h3>
                       <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 relative overflow-hidden">
                          <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-200/50" />
                          <div className="relative z-10 text-emerald-700">
                             <p className="text-4xl font-black mb-2">
                               {selectedTenant.financialStatus === 'advance' ? 'EXCELLENT' : 
                                selectedTenant.financialStatus === 'ok' ? 'À JOUR' : 'ATTENTION'}
                             </p>
                             <p className="text-sm font-bold opacity-70 leading-relaxed">
                               {selectedTenant.monthsCovered.toFixed(1)} mois couverts pour {selectedTenant.tenureMonths.toFixed(1)} mois occupés.
                               {selectedTenant.financialBalance > 0 ? ` (${selectedTenant.financialBalance.toFixed(1)} mois d'avance)` : ''}
                             </p>
                          </div>
                       </div>
                    </section>
                  </div>

                  <div className="space-y-10">
                    <section>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 py-2 border-b border-slate-50">Grand Livre Locataire (Expert)</h3>
                      <div className="space-y-4">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
                          <div className="flex justify-between items-start mb-8">
                             <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Versé à ce jour</p>
                                <p className="text-3xl font-black">{formatCurrency(selectedTenant.totalPaid)}</p>
                             </div>
                             <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                {selectedTenant.financialStatus === 'advance' ? 'En Avance' : 'Régulier'}
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6 mb-8">
                             <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Loyers + Charges</p>
                                <p className="text-xl font-black">{formatCurrency((selectedTenant.monthly_rent || 0) + (selectedTenant.charges || 0))}</p>
                             </div>
                             <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Caution Détenue</p>
                                <p className="text-xl font-black text-amber-400">{formatCurrency(selectedTenant.totalCaution)}</p>
                             </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
                           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historique des Paiements</span>
                              <CreditCard className="w-4 h-4 text-slate-300" />
                           </div>
                           <div className="divide-y divide-slate-50 max-h-[250px] overflow-y-auto custom-scrollbar">
                              {(selectedTenant.receipts || []).map((r: any) => (
                                <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                   <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.payment_status === 'partial' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                         {r.payment_status === 'partial' ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                      </div>
                                      <div>
                                         <p className="text-sm font-black text-slate-800">{formatCurrency(r.amount_paid || r.total_amount)}</p>
                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {r.period_month}/{r.period_year} — {r.payment_status === 'partial' ? 'Paiement Échelonné' : 'Soldé'}
                                         </p>
                                      </div>
                                   </div>
                                   <p className="text-[10px] font-black text-slate-300">{formatDate(r.payment_date)}</p>
                                </div>
                              ))}
                              {(selectedTenant.receipts || []).length === 0 && (
                                <div className="p-8 text-center">
                                   <p className="text-xs text-slate-400 font-medium italic">Aucun paiement enregistré.</p>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
