import React, { useEffect, useState, useMemo } from 'react';
import { 
  Wrench, Search, AlertTriangle, Clock, CheckCircle2, 
  PauseCircle, Calendar, MapPin, 
  Info, ArrowUpRight, BarChart3, Receipt
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoContext';
import { supabase } from '../../lib/config';
import { motion, AnimatePresence } from 'framer-motion';

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v ?? 0);

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_CONFIG: Record<string, { label: string; icon: React.FC<any>; color: string; bg: string }> = {
  open:        { label: 'Ouvert',        icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
  in_progress: { label: 'En cours',      icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50' },
  resolved:    { label: 'Résolu',        icon: CheckCircle2,  color: 'text-emerald-700', bg: 'bg-emerald-50' },
  closed:      { label: 'Clôturé',       icon: CheckCircle2,  color: 'text-slate-500', bg: 'bg-slate-50' },
  pending:     { label: 'En attente',    icon: PauseCircle,   color: 'text-blue-600', bg: 'bg-blue-50' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent:   { label: 'Urgent',   color: 'text-rose-700', bg: 'bg-rose-100' },
  high:     { label: 'Élevée',   color: 'text-orange-700', bg: 'bg-orange-100' },
  medium:   { label: 'Moyenne',  color: 'text-amber-700', bg: 'bg-amber-100' },
  low:      { label: 'Faible',   color: 'text-emerald-700', bg: 'bg-emerald-100' },
};

export const OwnerMaintenance: React.FC = () => {
  const { owner } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  useEffect(() => {
    if (!owner?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          const { MOCK_PROPERTIES, MOCK_TICKETS } = await import('../../lib/mockData');
          const demoOwnerId = 'demo-owner-1';
          const profileProps = MOCK_PROPERTIES.filter(p => p.owner_id === demoOwnerId);
          const propIds = profileProps.map(p => p.id);
          const profileTickets = MOCK_TICKETS.filter(t => propIds.includes(t.property_id));
          
          setTickets(profileTickets.map(t => ({
             ...t,
             property: profileProps.find(p => p.id === t.property_id)
          })));
          setLoading(false);
          return;
        }

        const { data: props } = await supabase
          .from('properties').select('id').eq('owner_id', owner.id);
        const propIds = (props || []).map((p: any) => p.id);

        if (propIds.length === 0) { setTickets([]); setLoading(false); return; }

        const { data: tks } = await supabase
          .from('tickets')
          .select('id, title, description, status, priority, cost, created_at, updated_at, property_id, property:properties(title, location)')
          .in('property_id', propIds)
          .order('created_at', { ascending: false });

        setTickets(tks || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [owner?.id, isDemoMode]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return tickets.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(s) || (t.property?.title || '').toLowerCase().includes(s);
      const matchFilter = filter === 'all' || t.status === filter;
      return matchSearch && matchFilter;
    });
  }, [tickets, search, filter]);

  const summary = useMemo(() => ({
    open: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    totalCost: tickets.reduce((s, t) => s + (t.cost || 0), 0),
  }), [tickets]);

  if (loading) return (
    <div className="space-y-8 animate-pulse">
       <div className="h-12 bg-slate-200 rounded-2xl w-1/3" />
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl" />)}
       </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Travaux & Entretien</h1>
          <p className="text-slate-500 mt-1 font-medium">Suivi technique et financier de votre parc</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input
              type="text"
              placeholder="Chercher un incident ou un bien..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all"
            />
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            {[['all','Tous'], ['open','Ouverts'], ['in_progress','En cours'], ['resolved','Terminés']].map(([v, l]) => (
              <button 
                key={v}
                onClick={() => setFilter(v as any)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === v ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Interventions en cours', value: summary.open, icon: Clock, color: 'rose' },
          { label: 'Travaux clôturés', value: summary.resolved, icon: CheckCircle2, color: 'emerald' },
          { label: 'Nombre Total de Dossiers', value: tickets.length, icon: Receipt, color: 'amber' },
          { label: 'Budget global engagé', value: formatCurrency(summary.totalCost), icon: BarChart3, color: 'slate' },
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:shadow-slate-200/50 transition-all`}
          >
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                s.color === 'rose' ? 'bg-rose-50 text-rose-500' :
                s.color === 'emerald' ? 'bg-emerald-50 text-emerald-500' :
                s.color === 'amber' ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-500'
             }`}>
                <s.icon className="w-6 h-6" />
             </div>
             <p className="text-2xl font-black text-slate-900 tracking-tight">{s.value}</p>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center px-8"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                 <Wrench className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Aucun ticket de maintenance</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto font-medium">
                Toutes les demandes de travaux ou d'entretien sont centralisées ici. 
                Contactez votre agence pour signaler un nouvel incident.
              </p>
            </motion.div>
          ) : filtered.map((t, i) => {
            const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG['open'];
            const priorityCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG['medium'];
            const StatusIcon = statusCfg.icon;
            
            return (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                   <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                         <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${statusCfg.bg} ${statusCfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" /> {statusCfg.label}
                         </span>
                         <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${priorityCfg.bg} ${priorityCfg.color}`}>
                            Priorité {priorityCfg.label}
                         </span>
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-auto lg:ml-0">
                           #{t.id.slice(0, 8).toUpperCase()}
                         </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{t.title}</h3>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 mt-2">
                           <MapPin className="w-4 h-4 text-emerald-500" /> {t.property?.title || 'Bien non spécifié'}
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 italic font-medium">
                        "{t.description || "Aucune description supplémentaire fournie."}"
                      </p>
                   </div>

                   <div className="lg:w-64 space-y-4">
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Montant Facturé</p>
                         <p className="text-2xl font-black text-slate-900">{formatCurrency(t.cost || 0)}</p>
                         <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           {t.status === 'resolved' || t.status === 'closed' ? (
                             <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Traité</>
                           ) : (
                             <><Clock className="w-3.5 h-3.5" /> En cours</>
                           )}
                         </div>
                      </div>
                      
                      <div className="flex items-center justify-between px-2">
                         <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                            <Calendar className="w-3.5 h-3.5" /> {formatDate(t.created_at)}
                         </div>
                         <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                            Détails <ArrowUpRight className="w-3 h-3" />
                         </button>
                      </div>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white overflow-hidden relative group">
         <div className="absolute top-0 right-0 p-12">
            <Info className="w-24 h-24 text-white/5 group-hover:text-amber-500/10 transition-colors duration-700" />
         </div>
         <div className="relative z-10 max-w-3xl">
            <h3 className="text-2xl font-black mb-4">Fonctionnement des Travaux</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
               Chaque intervention déclenchée par un locataire ou par vous-même fait l'objet d'un ticket. 
               Votre agence mandate un prestataire agréé, soumet un devis pour validation (si le montant est supérieur à la limite contractuelle), 
               et supervise la résolution technique. Les coûts réels sont prélevés sur vos revenus locatifs.
            </p>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 tracking-wide uppercase tracking-[0.1em]">Garantie Décennale</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 tracking-wide uppercase tracking-[0.1em]">Prestataires Agrées</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
