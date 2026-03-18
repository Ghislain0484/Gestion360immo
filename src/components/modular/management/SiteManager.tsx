import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Plus, Trash2, Edit3, Wifi, Shield, Zap, Waves, Loader2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { dbService } from '../../../lib/supabase';
import { ResidenceSite } from '../../../types/modular';
import toast from 'react-hot-toast';

export const SiteManager: React.FC = () => {
    const { agencyId } = useAuth();
    const [sites, setSites] = useState<ResidenceSite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<ResidenceSite | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        zone: 'Cocody',
        address: '',
        city: 'Abidjan',
        amenities: [] as string[]
    });

    const zones = ['Cocody', 'Plateau', 'Marcory', 'Assinie', 'Bassam', 'Riviera', 'Zone 4', 'Angré'];
    const availableAmenities = [
        { name: 'Wifi', icon: <Wifi size={14} /> },
        { name: 'Sécurité 24/7', icon: <Shield size={14} /> },
        { name: 'Générateur', icon: <Zap size={14} /> },
        { name: 'Piscine', icon: <Waves size={14} /> },
    ];

    useEffect(() => {
        if (agencyId) {
            fetchSites();
        }
    }, [agencyId]);

    const fetchSites = async () => {
        try {
            setIsLoading(true);
            const data = await dbService.modular.getSites(agencyId!);
            setSites(data);
        } catch (error) {
            console.error('Error fetching sites:', error);
            toast.error('Erreur lors du chargement des sites');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agencyId) return;

        try {
            setIsSaving(true);
            await dbService.modular.createSite({
                ...formData,
                agency_id: agencyId
            });
            toast.success('Site créé avec succès');
            setIsModalOpen(false);
            setFormData({ name: '', zone: 'Cocody', address: '', city: 'Abidjan', amenities: [] });
            fetchSites();
        } catch (error) {
            console.error('Error saving site:', error);
            toast.error('Erreur lors de la création du site');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleAmenity = (name: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(name)
                ? prev.amenities.filter(a => a !== name)
                : [...prev.amenities, name]
        }));
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-xs font-black uppercase text-slate-400">Chargement de votre parc...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-2">
                        <Building2 className="text-indigo-600" />
                        Gestion des Sites & Immeubles
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Organisez vos appartements par résidence géographique</p>
                </div>
                <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => setIsModalOpen(true)}>
                    AJOUTER UN SITE
                </Button>
            </div>

            {sites.length === 0 ? (
                <Card className="p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Building2 size={32} className="text-slate-300" />
                    </div>
                    <h4 className="font-black text-slate-800 uppercase italic">Aucun site enregistré</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">Commencez par créer votre premier immeuble ou résidence pour y ajouter des appartements.</p>
                    <Button variant="outline" size="sm" className="mt-6" onClick={() => setIsModalOpen(true)}>CRÉER LE PREMIER SITE</Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sites.map(site => (
                        <Card key={site.id} className="p-5 border-0 shadow-md hover:shadow-lg transition-all bg-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Building2 size={80} />
                            </div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h4 className="font-black text-lg text-slate-800 leading-tight uppercase italic">{site.name}</h4>
                                    <p className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mt-1 uppercase italic">
                                        <MapPin size={12} /> {site.zone} • {site.city}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{site.address}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                        <Edit3 size={16} />
                                    </button>
                                    <button className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-4 relative z-10">
                                {site.amenities?.map(amenity => (
                                    <span key={amenity} className="text-[8px] font-black uppercase px-2 py-1 rounded-md bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                                        {availableAmenities.find(a => a.name === amenity)?.icon}
                                        {amenity}
                                    </span>
                                ))}
                                {(!site.amenities || site.amenities.length === 0) && (
                                    <span className="text-[8px] font-bold uppercase text-slate-300 italic">Aucune commodité précisée</span>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingSite(null); }}
                title={editingSite ? "Modifier le Site" : "Nouveau Site de Résidence"}
            >
                <form onSubmit={handleSave} className="space-y-4 p-2">
                    <Input 
                        label="Nom de la Résidence / Immeuble" 
                        placeholder="ex: Résidence Les Perles" 
                        required 
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Zone Géographique</label>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500"
                                value={formData.zone}
                                onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value }))}
                            >
                                {zones.map(z => <option key={z} value={z}>{z}</option>)}
                            </select>
                        </div>
                        <Input 
                            label="Ville" 
                            defaultValue="Abidjan" 
                            value={formData.city}
                            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        />
                    </div>
                    <Input 
                        label="Adresse précise" 
                        placeholder="ex: Angré 7ème Tranche, rue L88" 
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400">Commodités (Amenities)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {availableAmenities.map(amenity => (
                                <label key={amenity.name} className="flex items-center gap-2 p-2 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        className="rounded text-indigo-600 focus:ring-indigo-500" 
                                        checked={formData.amenities.includes(amenity.name)}
                                        onChange={() => toggleAmenity(amenity.name)}
                                    />
                                    <span className="text-xs font-bold flex items-center gap-1 text-slate-600">
                                        {amenity.icon}
                                        {amenity.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button variant="primary" type="submit" isLoading={isSaving} leftIcon={<Plus size={16} />}>Enregistrer le Site</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

