import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Paintbrush, Zap, ShieldCheck, Plus, Info, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    propertyId: ''
  });

  const [properties, setProperties] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!owner?.id) return;
    supabase.from('properties').select('id, title').eq('owner_id', owner.id)
      .then(({ data }) => setProperties(data || []));
  }, [owner?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyId || !formData.title) {
        toast.error('Veuillez remplir les champs obligatoires');
        return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('tickets').insert({
        title: `[EMBELLISSEMENT] ${formData.title}`,
        description: `${formData.description}\n\nType: ${selectedPkg || 'Custom'}\nBudget cible: ${formData.budget} FCFA`,
        property_id: formData.propertyId,
        category: 'maintenance', // We use maintenance as base but title prefix filters it
        status: 'open',
        priority: 'low',
        owner_id: owner?.id // Assuming tickets has owner_id
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-[3rem] shadow-sm animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-4">Demande Transmise !</h2>
      <p className="text-slate-500 max-w-md mb-8">
        Votre gestionnaire d'agence va examiner votre projet d'embellissement et vous contactera avec un devis détaillé et une estimation de la valorisation locative.
      </p>
      <button 
        onClick={() => setSuccess(false)}
        className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
      >
        Nouveau Projet
      </button>
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Valorisation & Embellissement</h1>
        <p className="text-slate-500 mt-2 font-medium">Augmentez la valeur de votre capital immobilier en modernisant vos biens.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Packages */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Packs de Valorisation
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {ENHANCEMENT_PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              const active = selectedPkg === pkg.id;
              return (
                <button 
                  key={pkg.id}
                  onClick={() => {
                    setSelectedPkg(pkg.id);
                    setFormData(prev => ({ ...prev, title: pkg.title, description: pkg.description }));
                  }}
                  className={`flex items-start gap-5 p-6 rounded-[2rem] text-left border-2 transition-all group ${
                    active ? 'bg-slate-900 border-slate-900 text-white shadow-2xl' : 'bg-white border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
                    active ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white'
                  }`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-black tracking-tight">{pkg.title}</h4>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                         VALEUR LOCATIVE {pkg.expectedYield}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${active ? 'text-slate-400' : 'text-slate-500'}`}>
                      {pkg.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex gap-4">
             <Info className="w-6 h-6 text-indigo-500 shrink-0" />
             <div className="space-y-1">
               <p className="text-sm font-black text-indigo-900">Le Saviez-vous ?</p>
               <p className="text-xs text-indigo-800 leading-relaxed">
                 Un bien "rafraîchi" se loue en moyenne **22 jours plus vite** qu'un bien standard sur le marché ivoirien. 
                 L'investissement initial est généralement amorti en moins de 18 mois via l'augmentation du loyer.
               </p>
             </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/20 relative">
           <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
           
           <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <Plus className="w-6 h-6 p-1.5 bg-slate-900 text-white rounded-lg" />
                Soumettre un Projet
              </h3>

              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4">Sélectionner un Bien</label>
                 <select 
                    required
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none"
                    value={formData.propertyId}
                    onChange={e => setFormData(p => ({ ...p, propertyId: e.target.value }))}
                 >
                    <option value="">Sélectionner une propriété...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4">Quel est votre projet ?</label>
                 <input 
                    required
                    placeholder="Titre du projet (ex: Rénovation Façade)"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4">Détails & Objectifs</label>
                 <textarea 
                    rows={4}
                    placeholder="Décrivez ce que vous souhaitez accomplir..."
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all resize-none"
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4">Budget Approximatif (Optionnel)</label>
                 <input 
                    type="number"
                    placeholder="Ex: 5 000 000"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                    value={formData.budget}
                    onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))}
                 />
                 <p className="text-[10px] text-slate-400 ml-4 italic">Votre agence reviendra vers vous avec un devis précis.</p>
              </div>

              <button 
                disabled={loading}
                className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? 'Envoi...' : (
                  <>
                    <span>TRANSMETTRE À MON GESTIONNAIRE</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
           </form>
        </div>
      </div>
    </div>
  );
};
