import React, { useEffect, useState, useMemo } from 'react';
import { Gem, TrendingUp, Info, ArrowUpRight, Percent } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { motion } from 'framer-motion';

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v ?? 0);

export const OwnerPortfolio: React.FC = () => {
  const { owner } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [yieldRate, setYieldRate] = useState(7.5); // Default market yield for Côte d'Ivoire / West Africa

  useEffect(() => {
    if (!owner?.id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('properties')
        .select('id, title, monthly_rent, location')
        .eq('owner_id', owner.id);
      setProperties(data || []);
      setLoading(false);
    };
    load();
  }, [owner?.id]);

  const stats = useMemo(() => {
    const annualRent = properties.reduce((s, p) => s + (p.monthly_rent || 0), 0) * 12;
    const estimatedValue = annualRent / (yieldRate / 100);
    return {
      annualRent,
      estimatedValue,
      propertyCount: properties.length,
      monthlyRent: annualRent / 12
    };
  }, [properties, yieldRate]);

  if (loading) return <div className="animate-pulse space-y-8"><div className="h-40 bg-slate-200 rounded-3xl"/><div className="grid grid-cols-3 gap-6"><div className="h-32 bg-slate-100 rounded-2xl"/><div className="h-32 bg-slate-100 rounded-2xl"/><div className="h-32 bg-slate-100 rounded-2xl"/></div></div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Calculateur de Patrimoine</h1>
          <p className="text-slate-500 mt-2">Estimez la valeur de votre parc immobilier selon les rendements du marché.</p>
        </div>
        <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
           <span className="text-xs font-black uppercase tracking-widest text-slate-400 pl-3">Taux de Rendement Cible :</span>
           <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200">
             <input 
               type="number" 
               value={yieldRate} 
               onChange={(e) => setYieldRate(Math.max(1, Math.min(20, Number(e.target.value))))}
               className="w-12 bg-transparent text-center font-bold text-slate-900 focus:outline-none"
             />
             <span className="text-slate-400 font-bold">%</span>
           </div>
        </div>
      </div>

      {/* Main Value Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20"
        >
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                   <Gem className="w-6 h-6 text-emerald-400" />
                 </div>
                 <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Valeur Patrimoniale Estimée</p>
              </div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-none mb-4">
                {formatCurrency(stats.estimatedValue)}
              </h2>
              <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-400/10 self-start px-4 py-1.5 rounded-full text-sm">
                <TrendingUp className="w-4 h-4" /> 
                <span>Basé sur un rendement net de {yieldRate}%</span>
              </div>
            </div>

            <div className="mt-12 flex items-center gap-10 border-t border-white/5 pt-8">
               <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Revenus Annuels</p>
                 <p className="text-xl font-bold">{formatCurrency(stats.annualRent)}</p>
               </div>
               <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nombre de Biens</p>
                 <p className="text-xl font-bold">{stats.propertyCount} Unités</p>
               </div>
            </div>
          </div>
        </motion.div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-900 mb-4">Analyse de Rentabilité</h3>
             <p className="text-sm text-slate-500 leading-relaxed">
               La valeur de votre patrimoine est calculée par **capitalisation des revenus**. 
               À un taux de {yieldRate}%, cela signifie que le marché est prêt à payer {Math.round(100/yieldRate)} fois vos revenus annuels pour acquérir votre parc.
             </p>
           </div>
           
           <div className="space-y-4 mt-8">
             <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
               <div className="flex items-center gap-3 mb-2">
                 <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                 <p className="text-xs font-black text-emerald-900 uppercase">Indice de liquidité</p>
               </div>
               <p className="text-lg font-black text-emerald-700">EXCELLENT</p>
             </div>
             
             <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
               <div className="flex items-center gap-3 mb-2">
                 <Percent className="w-5 h-5 text-blue-600" />
                 <p className="text-xs font-black text-blue-900 uppercase">Taux d'occupation</p>
               </div>
               <p className="text-lg font-black text-blue-700">100%</p>
             </div>
           </div>
        </div>
      </div>

      {/* Property Breakdown */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
           <h3 className="text-lg font-black text-slate-900">Détail par Propriété</h3>
           <Info className="w-5 h-5 text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Bien</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Loyer Mensuel</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Loyer Annuel</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Valeur Estimée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {properties.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-900">{p.title}</p>
                    <p className="text-xs text-slate-400">
                      {typeof p.location === 'object' 
                        ? `${p.location?.quartier || ''}, ${p.location?.commune || ''}`.replace(/^, |, $/, '')
                        : p.location}
                    </p>
                  </td>
                  <td className="px-8 py-6 font-bold text-slate-700">{formatCurrency(p.monthly_rent)}</td>
                  <td className="px-8 py-6 font-bold text-slate-700">{formatCurrency(p.monthly_rent * 12)}</td>
                  <td className="px-8 py-6">
                    <p className="font-black text-emerald-600">{formatCurrency((p.monthly_rent * 12) / (yieldRate / 100))}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex gap-4">
        <Info className="w-6 h-6 text-amber-500 shrink-0" />
        <p className="text-sm text-amber-800 leading-relaxed">
          **Note importante :** Cette estimation est purement indicative et basée sur la capitalisation locative. 
          Elle ne prend pas en compte l'état du bâti, la valeur du terrain nu ou les fluctuations spéculatives. 
          Consultez un expert agréé pour une expertise vénale officielle.
        </p>
      </div>
    </div>
  );
};
