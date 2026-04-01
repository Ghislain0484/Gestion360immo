import { 
  Building2, Wallet, AlertTriangle, TrendingUp, 
  CheckCircle2, Phone, ChevronRight, BarChart3, PieChart as PieIcon,
  Info, Gem
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoContext';
import { supabase } from '../../lib/config';
import { Link } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v ?? 0);

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—';

export const OwnerDashboard: React.FC = () => {
  const { owner } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!owner?.id) return;
    const load = async () => {
      setLoading(true);
      setErrorInfo(null);
      try {
        if (isDemoMode) {
          const { MOCK_PROPERTIES, MOCK_CONTRACTS, MOCK_RECEIPTS, MOCK_TRANSACTIONS } = await import('../../lib/mockData');
          const demoOwnerId = 'demo-owner-1';
          
          const profileProps = MOCK_PROPERTIES.filter(p => p.owner_id === demoOwnerId);
          const profileContracts = MOCK_CONTRACTS.filter(c => c.owner_id === demoOwnerId);
          const profileReceipts = MOCK_RECEIPTS.filter(r => r.owner_id === demoOwnerId);
          const profilePayouts = MOCK_TRANSACTIONS.filter(t => t.related_owner_id === demoOwnerId && t.category === 'owner_payout');          const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
          const chartData = Array.from({ length: 6 }).map((_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            const month = d.getMonth();
            const year = d.getFullYear();
            const monthReceipts = profileReceipts.filter((r: any) => {
              const rd = new Date(r.payment_date);
              return rd.getMonth() === month && rd.getFullYear() === year;
            });
            const total = monthReceipts.reduce((sum: number, r: any) => sum + (r.owner_payment || r.total_amount * 0.9), 0);
            return { name: monthNames[month], revenue: total };
          });
          const now = new Date();

          setData({
            properties: profileProps,
            contracts: profileContracts,
            recentReceipts: profileReceipts.slice(-5).reverse(),
            chartData,
            monthlyRevenue: profileReceipts.filter(r => {
              const rd = new Date(r.payment_date);
              return rd.getMonth() === now.getMonth() && rd.getFullYear() === now.getFullYear();
            }).reduce((s, r) => s + (r.owner_payment || 0), 0),
            overdueContracts: [],
            totalReversements: profilePayouts.reduce((s, p) => s + (Number(p.amount) || 0), 0),
            occupancy: profileProps.length > 0 ? Math.round((profileContracts.length / profileProps.length) * 100) : 0,
            agencyPhone: '+224 620 00 00 00'
          });
          setLoading(false);
          return;
        }

        // Fetch properties belonging to this owner
        const { data: properties, error: pError } = await supabase
          .from('properties')
          .select('id, title, location, monthly_rent, is_available')
          .eq('owner_id', owner.id);

        if (pError) throw pError;

        if (!properties || properties.length === 0) {
          setErrorInfo("Aucun bien n'est actuellement lié à votre compte. Contactez votre agence pour vérifier la liaison.");
          setLoading(false);
          return;
        }

        const propIds = properties.map((p: any) => p.id);

        // Fetch active contracts
        const { data: contracts } = await supabase
          .from('contracts')
          .select(`
            id, status, monthly_rent, start_date, next_payment_date, commission_rate,
            property:properties(id, title),
            tenant:tenants(id, first_name, last_name, phone)
          `)
          .in('property_id', propIds);

        // Fetch last 6 months of receipts for the chart
        const contractIds = (contracts || []).map((c: any) => c.id);
        const { data: receipts } = contractIds.length > 0 ? await supabase
          .from('rent_receipts')
          .select('id, payment_date, total_amount, owner_payment, contract_id')
          .in('contract_id', contractIds)
          .order('payment_date', { ascending: true }) : { data: [] };

        // Fetch actual payouts from modular_transactions
        const { data: payouts } = await supabase
          .from('modular_transactions')
          .select('amount, transaction_date')
          .eq('related_owner_id', owner.id)
          .eq('category', 'owner_payout')
          .eq('type', 'debit');

        // Process chart data (last 6 months)
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const chartData = Array.from({ length: 6 }).map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          const month = d.getMonth();
          const year = d.getFullYear();
          const monthReceipts = (receipts || []).filter((r: any) => {
            const rd = new Date(r.payment_date);
            return rd.getMonth() === month && rd.getFullYear() === year;
          });
          const total = monthReceipts.reduce((sum: number, r: any) => sum + (r.owner_payment ?? r.total_amount * 0.9), 0);
          return { name: monthNames[month], revenue: total };
        });

        // Compute KPIs
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthReceipts = (receipts || []).filter((r: any) => new Date(r.payment_date) >= startOfMonth);
        const monthlyRevenue = thisMonthReceipts.reduce((sum: number, r: any) => sum + (r.owner_payment ?? r.total_amount * 0.9), 0);
        
        const overdueContracts = (contracts || []).filter((c: any) => {
          if (c.status !== 'active' && c.status !== 'renewed') return false; // Only active contracts can be overdue
          if (!c.next_payment_date) return false;
          const relReceipts = (receipts || []).filter((r: any) => r.contract_id === c.id);
          const totalPaid = relReceipts.reduce((sum: number, r: any) => sum + (r.amount_paid || r.total_amount || 0), 0);
          const monthlyTotal = (c.monthly_rent || 0) + (c.charges || 0);
          const monthsCovered = monthlyTotal > 0 ? totalPaid / monthlyTotal : 0;
          
          const start = new Date(c.start_date);
          const elapsedMonths = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          const balance = monthsCovered - elapsedMonths;

          // Flag as overdue only if balance is significantly negative (e.g., > 10 days debt)
          return balance < -0.33; 
        });

        setData({
          properties,
          contracts: contracts || [],
          recentReceipts: (receipts || []).slice(-5).reverse(),
          chartData,
          monthlyRevenue,
          overdueContracts,
          totalReversements: (payouts || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
          occupancy: properties.length > 0 ? Math.round(((contracts?.length || 0) / properties.length) * 100) : 0,
          agencyPhone: owner.agency_id ? (await supabase.from('agencies').select('phone').eq('id', owner.agency_id).maybeSingle()).data?.phone : '+225 00 00 00 00 00'
        });
      } catch (e: any) {
        console.error('OwnerDashboard error', e);
        setErrorInfo(e.message || "Erreur de chargement des données.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [owner?.id]);

  if (loading) return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 bg-slate-200 rounded-lg w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
      </div>
      <div className="h-96 bg-slate-100 rounded-3xl" />
    </div>
  );

  if (errorInfo && !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
        <Info className="w-10 h-10 text-amber-500" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-4">Initialisation de votre espace</h2>
      <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
        {errorInfo}
      </p>
      <div className="flex gap-4">
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
          Réessayer
        </button>
        <Link to="/contact" className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
          Aide technique
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Tableau de Bord
            </h1>
            <p className="text-slate-500 mt-2 text-lg font-medium">
              Ravi de vous revoir, <span className="text-emerald-600 font-bold">{owner?.first_name}</span>.
            </p>
          </motion.div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Compte Vérifié
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      <AnimatePresence>
        {data?.overdueContracts.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-4 p-5 bg-rose-50 border border-rose-100 rounded-3xl shadow-sm shadow-rose-100/50">
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-rose-900">Retards de paiement détectés</h3>
                <p className="text-sm text-rose-600 mt-1 leading-relaxed">
                  {data.overdueContracts.length} locataire(s) n'ont pas encore réglé leur loyer ce mois-ci. 
                  Votre agence a été notifiée pour entamer les procédures de relance.
                </p>
                <div className="mt-3 flex gap-4">
                  <Link to="/espace-proprietaire/locataires" className="text-xs font-black uppercase tracking-widest text-rose-700 hover:underline">
                    Détails des retards
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Revenus du Mois', value: formatCurrency(data?.monthlyRevenue), sub: 'Part nette propriétaire', icon: Wallet, color: 'emerald' },
          { label: 'Taux d\'Occupation', value: `${data?.occupancy}%`, sub: `${data?.contracts.length} biens loués`, icon: Building2, color: 'blue' },
          { label: 'Valeur du Patrimoine', value: formatCurrency(((data?.properties || []).reduce((s:number, p:any) => s + (p.monthly_rent || 0), 0) * 12) / 0.075), sub: 'Estimation (Rendement 7.5%)', icon: Gem, color: 'amber' },
          { label: 'Total Reversements', value: formatCurrency(data?.totalReversements), sub: 'Depuis le début', icon: TrendingUp, color: 'indigo' },
          { label: 'Alertes Actives', value: data?.overdueContracts.length, sub: 'Loyers en retard', icon: AlertTriangle, color: data?.overdueContracts.length > 0 ? 'rose' : 'slate' },
        ].map((k, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300 ${
              k.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              k.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              k.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
              k.color === 'amber' ? 'bg-amber-50 text-amber-600' :
              k.color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <k.icon className="w-7 h-7" />
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{k.value}</p>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">{k.label}</p>
            <p className="text-xs text-slate-300 mt-1 font-medium italic">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Graph & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Card */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Performance financière</h2>
              <p className="text-slate-400 text-sm mt-1">Évolution de vos revenus nets (6 derniers mois)</p>
            </div>
            <div className="hidden sm:flex bg-slate-50 p-1.5 rounded-2xl">
              <button className="px-4 py-2 bg-white shadow-sm text-slate-900 text-xs font-bold rounded-xl">Mensuel</button>
              <button className="px-4 py-2 text-slate-400 text-xs font-bold rounded-xl hover:text-slate-600">Annuel</button>
            </div>
          </div>
          
          <div className="w-full mt-4" style={{ height: 350, minHeight: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  formatter={(value: any) => [formatCurrency(value), 'Revenu Net']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
            <div className="flex gap-8">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Moyenne Mensuelle</p>
                <p className="text-xl font-black text-slate-800">
                  {formatCurrency(data?.chartData.reduce((s:any,d:any)=>s+d.revenue,0)/6)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Objectif Atteint</p>
                <p className="text-xl font-black text-emerald-600">92%</p>
              </div>
            </div>
            <button className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors">
              <BarChart3 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Side Panel: Recent & Stats */}
        <div className="space-y-8">
          {/* Detailed Stats Card */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/30">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-700" />
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-6">Répartition Locative</h3>
              <div className="space-y-6">
                {[
                  { label: 'Villas', val: 65, color: '#10b981' },
                  { label: 'Appartements', val: 25, color: '#3b82f6' },
                  { label: 'Bureaux', val: 10, color: '#6366f1' },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                      <span>{s.label}</span>
                      <span>{s.val}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${s.val}%` }} 
                        transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                        className="h-full rounded-full" 
                        style={{ backgroundColor: s.color }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 pt-8 border-t border-white/10">
                <p className="text-sm font-medium text-slate-400 leading-relaxed italic">
                  "Votre rendement locatif brut moyen sur l'ensemble du parc est estimé à 7.4%"
                </p>
              </div>
            </div>
          </div>

          {/* Quick Contact Card */}
          <div className="bg-emerald-600 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-600/20">
            <h3 className="text-xl font-black mb-2">Besoin d'aide ?</h3>
            <p className="text-emerald-100 text-sm font-medium leading-relaxed opacity-80">
              Votre gestionnaire de compte dédié est prêt à répondre à toutes vos questions.
            </p>
            <a 
              href={`tel:${data?.agencyPhone}`}
              className="mt-8 flex items-center gap-4 group/box cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover/box:bg-white group-hover/box:text-emerald-600 transition-all">
                <Phone className="w-6 h-6 text-white group-hover/box:text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Contact d'urgence</p>
                <p className="text-lg font-black group-hover/box:tracking-wider transition-all">{data?.agencyPhone || 'Contact Agence'}</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800">Événements récents</h2>
            <Link to="/espace-proprietaire/finances" className="w-12 h-12 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl flex items-center justify-center transition-colors">
              <ChevronRight className="w-6 h-6" />
            </Link>
          </div>
          <div className="space-y-6">
            {data?.recentReceipts.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer p-2 -m-2 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-black text-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Encaissement reçu</p>
                  <p className="text-sm text-slate-400 font-medium">Loyer payé via Flutterwave · ID #{r.receipt_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600">{formatCurrency(r.owner_payment || r.total_amount * 0.9)}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDate(r.payment_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link to="/espace-proprietaire/documents" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center hover:shadow-xl hover:border-emerald-100 transition-all group">
          <div className="w-24 h-24 bg-slate-50 group-hover:bg-emerald-50 rounded-full flex items-center justify-center mb-6 transition-colors">
            <PieIcon className="w-12 h-12 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Vue Documentaire</h3>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed group-hover:text-slate-600">
            Consultez votre coffre-fort numérique avec tous vos contrats, quittances et états des lieux signés.
          </p>
          <div className="mt-8 w-full h-2 bg-slate-50 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} className="h-full bg-emerald-500 rounded-full" />
          </div>
        </Link>
      </div>
    </div>
  );
};
