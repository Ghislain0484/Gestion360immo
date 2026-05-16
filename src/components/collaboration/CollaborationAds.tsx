import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Search, MapPin, Building2, Phone, Filter, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/config';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const CollaborationAds: React.FC = () => {
  const { agencyId: authAgencyId } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent'>('all');

  const [formData, setFormData] = useState({
    type: 'rent',
    category: 'residential',
    title: '',
    description: '',
    price: '',
    location_text: '',
    contact_phone: '',
  });

  const loadAds = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('collaboration_ads')
        .select('*, agency:agencies(name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAds(data || []);
    } catch (err: any) {
      toast.error('Erreur de chargement des annonces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, [filterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authAgencyId) return;

    try {
      const { error } = await supabase
        .from('collaboration_ads')
        .insert([{
          ...formData,
          agency_id: authAgencyId,
          price: formData.price ? parseFloat(formData.price) : null
        }]);

      if (error) throw error;

      toast.success('Annonce publiée avec succès !');
      setShowAddForm(false);
      setFormData({
        type: 'rent',
        category: 'residential',
        title: '',
        description: '',
        price: '',
        location_text: '',
        contact_phone: '',
      });
      loadAds();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteAd = async (id: string) => {
    if (!window.confirm('Voulez-vous supprimer cette annonce ?')) return;
    try {
      const { error } = await supabase
        .from('collaboration_ads')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Annonce supprimée');
      loadAds();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl border-none relative overflow-hidden group shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Megaphone className="h-32 w-32 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black text-white flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
                <Megaphone className="h-7 w-7 text-white" />
              </div>
              Annonces Inter-Agences
            </h2>
            <p className="text-white font-medium text-lg max-w-xl opacity-95 leading-relaxed">
              Le Marketplace exclusif <span className="font-black underline decoration-white/30 underline-offset-4">Gestion360immo</span>. Partagez vos opportunités de vente ou location et trouvez des partenaires d'affaires en un clic.
            </p>
          </div>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-premium bg-white text-blue-600 hover:bg-blue-50 border-none shadow-xl"
          >
            {showAddForm ? 'Fermer le formulaire' : (
              <>
                <Plus className="h-5 w-5" />
                Publier une opportunité
              </>
            )}
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="p-8 border-2 border-blue-100 dark:border-blue-500/20 shadow-2xl animate-in zoom-in-95 duration-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-1.5">Type d'opération</label>
                <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'rent'})}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'rent' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}
                  >Location</button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'sale'})}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'sale' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}
                  >Vente</button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-1.5">Catégorie</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="residential">🏡 Résidentiel (Appart, Villa)</option>
                  <option value="commercial">🏢 Commercial (Bureaux, Magasin)</option>
                  <option value="land">🌳 Terrain / Forêt</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-1.5">Titre de l'annonce</label>
              <input 
                type="text" required placeholder="Ex: Splendide Villa 5P avec piscine - Riviera 4"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-1.5">Description & Conditions</label>
              <textarea 
                rows={4} placeholder="Décrivez le bien, les commodités, les conditions de visite..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-1.5">Prix (F CFA)</label>
                <input 
                  type="number" placeholder="Ex: 500000"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-1.5">Localisation Exacte</label>
                <input 
                  type="text" placeholder="Ex: Cocody, Beverly Hills"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  value={formData.location_text}
                  onChange={(e) => setFormData({...formData, location_text: e.target.value})}
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-1.5">Contact Direct</label>
                <input 
                  type="text" placeholder="Ex: +225 07..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button type="button" className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowAddForm(false)}>Annuler</button>
              <Button type="submit" className="btn-premium">Propulser l'annonce</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters - Minimalist */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        {[
          { id: 'all', label: 'Toutes les opportunités' },
          { id: 'sale', label: 'Ventes' },
          { id: 'rent', label: 'Locations' }
        ].map(f => (
          <button 
            key={f.id}
            onClick={() => setFilterType(f.id as any)}
            className={`whitespace-nowrap px-6 py-2 rounded-full text-xs font-black uppercase tracking-tighter transition-all ${
              filterType === f.id 
                ? 'bg-slate-900 text-white shadow-lg ring-2 ring-slate-900' 
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ads.length > 0 ? (
            ads.map((ad) => (
              <div key={ad.id} className="card-glass overflow-hidden group">
                <div className={`h-1.5 ${ad.type === 'sale' ? 'bg-amber-500' : 'bg-emerald-500'} shadow-sm`} />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${
                      ad.type === 'sale' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {ad.type === 'sale' ? 'Vente' : 'Location'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {new Date(ad.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">{ad.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-4">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    <span>{ad.location_text || 'Localisation non spécifiée'}</span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-6 min-h-[60px] leading-relaxed">
                    {ad.description || 'Détails non fournis.'}
                  </p>

                  <div className="flex items-center justify-between pt-5 border-t border-slate-50 dark:border-slate-800/50">
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {ad.price ? `${ad.price.toLocaleString()} F` : 'Sur demande'}
                    </div>
                    <div className="flex gap-2">
                      {ad.agency_id === authAgencyId && (
                        <button 
                          onClick={() => deleteAd(ad.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <a 
                        href={`tel:${ad.contact_phone}`}
                        className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/20 hover:scale-110 active:scale-95 transition-all"
                        title="Appeler"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 pt-2">
                    <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Building2 className="h-3 w-3 text-slate-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {ad.agency?.name}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center card-glass border-dashed bg-slate-50/50">
              <div className="h-20 w-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Megaphone className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Le Marketplace est vide</h3>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">Soyez la première agence à dynamiser le réseau Gestion360immo en publiant votre opportunité !</p>
              <Button onClick={() => setShowAddForm(true)} className="btn-premium">
                Publier ma première annonce
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
