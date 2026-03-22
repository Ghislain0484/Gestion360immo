import React, { useEffect, useState, useMemo } from 'react';
import { 
  Building2, Search, Users, Banknote, CheckCircle2, 
  AlertCircle, MapPin, TrendingUp, Info, ArrowUpRight,
  TrendingDown, LayoutGrid, List as ListIcon, Calendar,
  Phone, ChevronRight, X, Maximize2, Shield, 
  Droplets, Zap, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoContext';
import { supabase } from '../../lib/config';
import { motion, AnimatePresence } from 'framer-motion';

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v ?? 0);

export const OwnerProperties: React.FC = () => {
  const { owner } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);

  useEffect(() => {
    if (!owner?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          const { MOCK_PROPERTIES, MOCK_CONTRACTS } = await import('../../lib/mockData');
          const demoOwnerId = 'demo-owner-1';
          
          const profileProps = MOCK_PROPERTIES.filter(p => p.owner_id === demoOwnerId);
          const profileContracts = MOCK_CONTRACTS.filter(c => (c.owner_id === demoOwnerId) && (c.status === 'active' || c.status === 'renewed'));

          setProperties(profileProps);
          setContracts(profileContracts);
          setLoading(false);
          return;
        }
        const { data: props } = await supabase
          .from('properties')
          .select('*')
          .eq('owner_id', owner.id)
          .order('title');

        const propIds = (props || []).map((p: any) => p.id);
        const { data: ctrs } = propIds.length > 0 ? await supabase
          .from('contracts')
          .select(`
            id, monthly_rent, commission_rate, next_payment_date, start_date, status, property_id,
            tenant:tenants(id, first_name, last_name, phone)
          `)
          .in('property_id', propIds)
          .in('status', ['active', 'renewed']) : { data: [] };

        setProperties(props || []);
        setContracts(ctrs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [owner?.id]);

  const enriched = useMemo(() => {
    return properties.map(p => {
      const contract = contracts.find((c: any) => c.property_id === p.id);
      const isLate = contract?.next_payment_date && new Date(contract.next_payment_date) < new Date();
      // Expert metric: Yield (simplified for demo: monthly rent * 12 / some base value if we had it, or just ratio)
      const commission = contract?.commission_rate ?? 10;
      const netMonthly = (contract?.monthly_rent || 0) * (1 - commission/100);
      
      return { ...p, contract, isOccupied: !!contract, isLate, netMonthly };
    });
  }, [properties, contracts]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return enriched.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(s) || (p.location?.quartier || '').toLowerCase().includes(s);
      const matchFilter = filter === 'all' || (filter === 'occupied' && p.isOccupied) || (filter === 'vacant' && !p.isOccupied);
      return matchSearch && matchFilter;
    });
  }, [enriched, search, filter]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const occupied = enriched.filter(p => p.isOccupied).length;
    const monthlyGross = enriched.reduce((s, p) => s + (p.contract?.monthly_rent || 0), 0);
    const monthlyNet = enriched.reduce((s, p) => s + (p.netMonthly || 0), 0);
    const vacancyCost = enriched.filter(p => !p.isOccupied).reduce((s, p) => s + (p.monthly_rent || 0), 0);
    
    return { total, occupied, vacant: total - occupied, monthlyGross, monthlyNet, vacancyCost };
  }, [enriched]);

  if (loading) return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 bg-slate-200 rounded-2xl w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1,2,3].map(i => <div key={i} className="h-44 bg-slate-100 rounded-3xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Search & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Votre Patrimoine</h1>
          <p className="text-slate-500 mt-1 font-medium">Gestion de vos {stats.total} biens immobiliers</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input
              type="text"
              placeholder="Rechercher une propriété..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 shadow-sm transition-all"
            />
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            {[['all','Tout'], ['occupied','Loué'], ['vacant','Libre']].map(([v, l]) => (
              <button 
                key={v}
                onClick={() => setFilter(v as any)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filter === v ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-300'}`}>
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-300'}`}>
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Financial Performance KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <p className="text-emerald-100 text-xs font-black uppercase tracking-[0.2em] mb-3">Revenu Net Mensuel</p>
          <p className="text-4xl font-black mb-4">{formatCurrency(stats.monthlyNet)}</p>
          <div className="flex items-center gap-2 text-emerald-100 text-sm font-bold bg-white/10 px-4 py-2 rounded-2xl w-fit">
            <TrendingUp className="w-4 h-4" /> +12% vs mois dernier
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group">
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-3 group-hover:text-emerald-600 transition-colors text-center sm:text-left">Taux d'Occupation</p>
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-4xl font-black text-slate-900 mb-6">{stats.total > 0 ? Math.round(stats.occupied/stats.total*100) : 0}%</p>
            <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${stats.total > 0 ? (stats.occupied/stats.total*100) : 0}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
            <p className="text-xs font-bold text-slate-400 italic">{stats.occupied} sur {stats.total} unités pourvues</p>
          </div>
        </div>

        <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 relative overflow-hidden group">
          <p className="text-rose-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Impact de la Vacance</p>
          <p className="text-4xl font-black text-rose-600 mb-4">-{formatCurrency(stats.vacancyCost)}</p>
          <p className="text-xs font-bold text-rose-400 leading-relaxed">
            Perte de revenus potentielle ce mois-ci due aux {stats.vacant} unité(s) vacantes.
          </p>
          <TrendingDown className="absolute -right-4 -bottom-4 w-24 h-24 text-rose-100/50" />
        </div>
      </div>

      {/* Properties Grid */}
      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
        {filtered.map((p, i) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 ${
              p.isLate ? 'ring-2 ring-rose-500/20 border-rose-100' : ''
            }`}
          >
            {/* Status Indicator */}
            <div className="relative h-48 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent z-10" />
              <img 
                src={p.images?.[0]?.url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800"} 
                alt={p.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute top-6 right-6 z-20">
                {p.isOccupied ? (
                  <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${
                    p.isLate ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {p.isLate ? '⚠ Retard' : 'Actif'}
                  </span>
                ) : (
                  <span className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-lg">
                    Vacant
                  </span>
                )}
              </div>
              <div className="absolute bottom-6 left-6 z-20">
                <p className="text-xs font-black text-rose-300 uppercase tracking-widest mb-1 shadow-sm">ID: {p.id?.slice(0, 8).toUpperCase() || 'PRO-01'}</p>
                <h3 className="text-xl font-black text-white decoration-emerald-400 group-hover:underline">{p.title}</h3>
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-2 mb-6 text-slate-400 text-sm font-bold">
                <MapPin className="w-4 h-4 text-emerald-500" /> 
                {p.location?.quartier}, {p.location?.commune}
              </div>

              {p.isOccupied ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-black">
                        {p.contract.tenant?.first_name?.[0]}{p.contract.tenant?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Locataire</p>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{p.contract.tenant?.first_name} {p.contract.tenant?.last_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => alert("Demande de mise en relation transmise à votre gestionnaire.")}
                         className="px-4 py-2 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center gap-2 text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all text-[10px] font-black uppercase tracking-widest"
                       >
                         <MessageSquare className="w-4 h-4" /> Agence
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-[1.8rem] bg-emerald-50 border border-emerald-100/50">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.1em] mb-2 leading-none">Net / Mois</p>
                      <p className="text-lg font-black text-emerald-700">{formatCurrency(p.netMonthly)}</p>
                    </div>
                    <div className="p-5 rounded-[1.8rem] bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2 leading-none">Loyer Brut</p>
                      <p className="text-lg font-bold text-slate-600">{formatCurrency(p.contract.monthly_rent)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5" /> Prochain encaissement: {new Date(p.contract.next_payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                  </div>
                </div>
              ) : (
                <div className="py-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-4">
                  <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-800 mb-1">Bien actuellement vacant</p>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Potentiel locatif : <span className="text-slate-900 font-black">{formatCurrency(p.monthly_rent)}</span>
                  </p>
                  <button className="mt-4 px-6 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                    Rechercher locataire
                  </button>
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                 <button 
                   onClick={() => setSelectedProperty(p)}
                   className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all group/btn"
                 >
                   Dossier de gestion <ChevronRight className="w-4 h-4 text-emerald-500" />
                 </button>
                 <div className="flex -space-x-2">
                    {[1,2,3].map(j => (
                      <div key={j} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                        <Info className="w-3 h-3" />
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Property Details Modal */}
      <AnimatePresence>
        {selectedProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProperty(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="relative h-64 sm:h-80 shrink-0">
                <img 
                  src={selectedProperty.images?.[0]?.url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200"} 
                  className="w-full h-full object-cover"
                  alt={selectedProperty.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                <button 
                  onClick={() => setSelectedProperty(null)}
                  className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-slate-900 rounded-2xl flex items-center justify-center transition-all z-10"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="absolute bottom-8 left-8">
                  <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-2">Dossier de Gestion</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-white">{selectedProperty.title}</h2>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/20">
                      ID: {selectedProperty.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      selectedProperty.isOccupied ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {selectedProperty.isOccupied ? 'Occupé' : 'Vacant'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 sm:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Key Stats Column */}
                  <div className="lg:col-span-2 space-y-10">
                    <section>
                      <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                        <Info className="w-5 h-5 text-emerald-500" /> Caractéristiques
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: 'Surface', val: selectedProperty.surface || 'N/A m²', icon: Maximize2 },
                          { label: 'Type Bail', val: 'Habitation', icon: Shield },
                          { label: 'Durée Bail', val: '12 mois ren.', icon: Zap },
                          { label: 'Charges', val: 'Incluses', icon: Droplets },
                        ].map((item, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                            <item.icon className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                            <p className="text-sm font-bold text-slate-800">{item.val}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                         <Shield className="w-5 h-5 text-emerald-500" /> Situation Locative
                      </h3>
                      {selectedProperty.isOccupied ? (
                        <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col md:flex-row gap-8 items-center justify-between">
                          <div className="flex items-center gap-6 text-center md:text-left">
                            <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                              {selectedProperty.contract.tenant?.first_name?.[0]}{selectedProperty.contract.tenant?.last_name?.[0]}
                            </div>
                            <div>
                              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Locataire Actuel</p>
                              <h4 className="text-xl font-black text-slate-900">{selectedProperty.contract.tenant?.first_name} {selectedProperty.contract.tenant?.last_name}</h4>
                              <p className="text-sm font-bold text-slate-400 italic mt-1">Intermédiation Agence</p>
                            </div>
                          </div>
                          <div className="text-center md:text-right">
                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Impact Net</p>
                            <p className="text-3xl font-black text-slate-900">{formatCurrency(selectedProperty.netMonthly)}</p>
                            <p className="text-[10px] font-bold text-emerald-600/60 uppercase mt-1">Après commission agence</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
                          <p className="text-slate-400 font-bold">Aucun locataire actif pour ce bien.</p>
                          <button 
                            onClick={() => alert("Publication de l'annonce en cours...")}
                            className="mt-4 px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                          >
                            Publier l'annonce
                          </button>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-8">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Emplacement</h3>
                      <div className="aspect-video bg-slate-200 rounded-2xl mb-4 overflow-hidden relative">
                         <img 
                           src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+10b981(-3.98,5.35)/-3.98,5.35,14/400x250?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`} 
                           alt="Map"
                           className="w-full h-full object-cover"
                         />
                         <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10">
                            <MapPin className="w-8 h-8 text-emerald-600 animate-bounce" />
                         </div>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{selectedProperty.location?.quartier || 'Localisation non définie'}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedProperty.location?.commune || 'Abidjan'}, Côte d'Ivoire</p>
                    </div>

                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                      <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest mb-4">Actions de Gestion</h3>
                      <div className="space-y-3">
                        <button 
                          onClick={() => alert("Signalement d'incident envoyé à l'agence.")}
                          className="w-full py-3 bg-white border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        >
                          Signaler un Incident
                        </button>
                        <button 
                          onClick={() => alert("Consultation de l'historique technique...")}
                          className="w-full py-3 bg-white border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        >
                          Historique Technique
                        </button>
                      </div>
                    </div>
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
