import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ArrowRight, Paintbrush, Zap, 
  ShieldCheck, Plus, Info, CheckCircle2, 
  ChevronRight, TrendingUp, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoContext';
import { supabase } from '../../lib/config';
import { toast } from 'react-hot-toast';

const ENHANCEMENT_PACKAGES = [
  { 
    id: 'paint', 
    title: 'Rafraîchissement & Design', 
    description: 'Nouveau revêtement, peinture premium et luminaires modernes pour attirer des locataires plus qualifiés.', 
    icon: Paintbrush, 
    color: 'emerald',
    expectedYield: '+1.5%'
  },
  { 
    id: 'energy', 
    title: 'Efficacité Énergétique', 
    description: 'Installation de panneaux solaires, climatisations inverter et isolation pour réduire les charges.', 
    icon: Zap, 
    color: 'amber',
    expectedYield: '+2.0%'
  },
  { 
    id: 'security', 
    title: 'Sécurité Avancée', 
    description: 'Vidéosurveillance IP, contrôle d\'accès biométrique et blindage des accès.', 
    icon: ShieldCheck, 
    color: 'blue',
    expectedYield: '+0.5%'
  }
];

export const OwnerEnhancement: React.FC = () => {
  const { owner } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    propertyId: ''
  });

  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    if (!owner?.id) return;
    
    const load = async () => {
      if (isDemoMode) {
        const { MOCK_PROPERTIES } = await import('../../lib/mockData');
        const demoOwnerId = 'demo-owner-1';
        setProperties(MOCK_PROPERTIES.filter(p => p.owner_id === demoOwnerId));
        return;
      }
      
      const { data } = await supabase.from('properties').select('id, title').eq('owner_id', owner.id);
      setProperties(data || []);
    };
    
    load();
  }, [owner?.id, isDemoMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyId || !formData.title) {
        toast.error('Veuillez remplir les champs obligatoires');
        return;
    }

    setLoading(true);
    try {
      if (isDemoMode) {
        // Simulated delay for demo
        await new Promise(r => setTimeout(r, 1500));
        setSuccess(true);
        toast.success('Demande de valorisation simulée envoyée !');
        return;
      }

      const { error } = await supabase.from('tickets').insert({
        title: `[EMBELLISSEMENT] ${formData.title}`,
        description: `${formData.description}\n\nType: ${selectedPkg || 'Custom'}\nBudget cible: ${formData.budget} FCFA`,
        property_id: formData.propertyId,
        category: 'maintenance',
        status: 'open',
        priority: 'low',
        owner_id: owner?.id
      });

      if (error) throw error;
      setSuccess(true);
      toast.success('Demande envoyée avec succès');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center p-12 bg-white rounded-[4rem] shadow-xl shadow-slate-200/50"
    >
      <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner shadow-emerald-500/10">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
      </div>
      <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Demande Transmise !</h2>
      <p className="text-slate-500 max-w-md mb-10 font-medium leading-relaxed">
        Votre gestionnaire d'agence va examiner votre projet d'embellissement et vous contactera avec un devis détaillé et une estimation de la valorisation locative.
      </p>
      <button 
        onClick={() => setSuccess(false)}
        className="px-10 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20"
      >
        Lancer un autre projet
      </button>
    </motion.div>
  );

  return (
    <div className="space-y-12 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Valorisation & Patrimoine</h1>
          <p className="text-slate-500 mt-2 font-medium">Investissez stratégiquement pour augmenter vos revenus locatifs.</p>
        </div>
        <div className="flex items-center gap-4 bg-emerald-50 px-6 py-4 rounded-[2rem] border border-emerald-100">
           <TrendingUp className="w-6 h-6 text-emerald-600" />
           <div>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Rendement Ciblé</p>
              <p className="text-sm font-black text-slate-900">+12% / an en moyenne</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Packages */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
             <Building2 className="w-6 h-6 text-slate-900" />
             <h2 className="text-xl font-black text-slate-900 tracking-tight">Packs d'Optimisation Immobilière</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {ENHANCEMENT_PACKAGES.map((pkg, i) => {
              const Icon = pkg.icon;
              const active = selectedPkg === pkg.id;
              return (
                <motion.button 
                  key={pkg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => {
                    setSelectedPkg(pkg.id);
                    setFormData(prev => ({ ...prev, title: pkg.title, description: pkg.description }));
                  }}
                  className={`flex items-center gap-6 p-8 rounded-[3rem] text-left border transition-all duration-500 group relative overflow-hidden ${
                    active ? 'bg-slate-900 border-slate-900 text-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.3)]' : 'bg-white border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 transition-all duration-500 ${
                    active ? 'bg-white/10 text-white rotate-12' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:-rotate-12'
                  }`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1 relative z-10">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-lg font-black tracking-tight">{pkg.title}</h4>
                      <div className={`px-3 py-1 rounded-full flex items-center gap-2 text-[8px] font-black uppercase tracking-widest ${
                         active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                         <Sparkles className="w-3 h-3" /> Yield {pkg.expectedYield}
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed font-medium ${active ? 'text-slate-400' : 'text-slate-500'}`}>
                      {pkg.description}
                    </p>
                  </div>
                  {active && (
                     <div className="absolute top-0 right-0 p-4">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                     </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-[3rem] relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
             <div className="flex gap-5 relative z-10">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                  <Info className="w-6 h-6" />
               </div>
               <div className="space-y-2">
                 <p className="font-black text-indigo-900 tracking-tight">Conseil d'Expert</p>
                 <p className="text-sm text-indigo-800 leading-relaxed font-medium">
                   "Un rafraîchissement complet permet de réduire la vacance locative de **65%**. L'investissement est amorti par la hausse du loyer en moins de **18 mois**."
                 </p>
               </div>
             </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="relative">
          <div className="sticky top-12 bg-white rounded-[4rem] p-12 border border-slate-100 shadow-2xl shadow-slate-200/50">
             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Initier un Projet</h3>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Sélectionner un Bien</label>
                   <select 
                      required
                      className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border border-slate-100 text-slate-900 font-black focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all cursor-pointer"
                      value={formData.propertyId}
                      onChange={e => setFormData(p => ({ ...p, propertyId: e.target.value }))}
                   >
                      <option value="">Choisir une propriété...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                   </select>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Titre de votre projet</label>
                   <input 
                      required
                      placeholder="Ex: Rénovation des Façades"
                      className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                      value={formData.title}
                      onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                   />
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Objectifs recherchés</label>
                   <textarea 
                      rows={4}
                      placeholder="Décrivez vos besoins ou les améliorations souhaitées..."
                      className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border border-slate-100 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all resize-none"
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                   />
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Budget prévisionnel (FCFA)</label>
                   <div className="relative">
                      <input 
                        type="number"
                        placeholder="Ex: 5 000 000"
                        className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border border-slate-100 text-slate-900 font-black focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                        value={formData.budget}
                        onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))}
                      />
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 font-black">XOF</div>
                   </div>
                </div>

                <button 
                  disabled={loading}
                  className="w-full py-6 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[2.5rem] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 disabled:opacity-50"
                >
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Sparkles className="w-5 h-5" /></motion.div>
                  ) : (
                    <>
                      <span>SOUMETTRE À L'AGENCE</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};
