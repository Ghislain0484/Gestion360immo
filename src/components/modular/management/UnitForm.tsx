import React, { useState, useEffect } from 'react';
import { Home, DollarSign, Info, MapPin, Loader2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { dbService } from '../../../lib/supabase';
import { ResidenceSite, ResidenceUnit } from '../../../types/modular';
import toast from 'react-hot-toast';

interface UnitFormProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

export const UnitForm: React.FC<UnitFormProps> = ({ onCancel, onSuccess }) => {
    const { agencyId } = useAuth();
    const [sites, setSites] = useState<ResidenceSite[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        site_id: '',
        unit_name: '',
        unit_category: 'studio' as ResidenceUnit['unit_category'],
        base_price_per_night: 0,
        caution_amount: 0,
        status: 'ready' as ResidenceUnit['status']
    });

    const unitTypes = [
        { id: 'studio', name: 'Studio Meublé', icon: 'S' },
        { id: '2-pieces', name: '2 Pièces (1 Ch. + 1 Salon)', icon: '2P' },
        { id: '3-pieces', name: '3 Pièces (2 Ch. + 1 Salon)', icon: '3P' },
        { id: 'penthouse', name: 'Penthouse Prestige', icon: 'PH' },
        { id: 'villa', name: 'Villa Haut Standing', icon: 'VL' },
    ];

    useEffect(() => {
        if (agencyId) {
            fetchSites();
        }
    }, [agencyId]);

    const fetchSites = async () => {
        try {
            const data = await dbService.modular.getSites(agencyId!);
            setSites(data);
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, site_id: data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
            toast.error('Erreur lors du chargement des résidences');
        } finally {
            setIsLoadingSites(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agencyId) return;
        if (!formData.site_id) {
            toast.error('Veuillez sélectionner une résidence');
            return;
        }

        try {
            setIsSaving(true);
            
            await dbService.modular.createUnit({
                agency_id: agencyId!,
                site_id: formData.site_id,
                unit_name: formData.unit_name,
                unit_type: unitTypes.find(t => t.id === formData.unit_category)?.name || 'Appartement',
                unit_category: formData.unit_category,
                base_price_per_night: formData.base_price_per_night,
                security_deposit_amount: formData.caution_amount,
                status: formData.status
            } as any);

            toast.success('Unité créée avec succès');
            onSuccess?.();
            onCancel?.();
        } catch (error) {
            console.error('Error saving unit:', error);
            toast.error('Erreur lors de la création de l\'unité');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="p-0 border-0 shadow-2xl bg-white overflow-hidden max-w-2xl mx-auto">
            <div className="bg-slate-900 p-6 text-white relative">
                <div className="absolute right-0 top-0 p-8 opacity-10">
                    <Home size={100} />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2 relative z-10">
                    <Home className="text-indigo-400" />
                    Configuration de l'Unité
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 relative z-10">Détails techniques et tarification par type</p>
            </div>

            <form className="p-8 space-y-6" onSubmit={handleSave}>
                {/* Site Selection */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                        <MapPin size={10} /> Résidence de rattachement
                    </label>
                    <select 
                        required
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black focus:border-indigo-500 outline-none transition-colors"
                        value={formData.site_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, site_id: e.target.value }))}
                    >
                        {isLoadingSites ? (
                            <option>Chargement...</option>
                        ) : (
                            <>
                                <option value="">Sélectionner une résidence...</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name} ({site.zone})</option>
                                ))}
                            </>
                        )}
                    </select>
                </div>

                {/* Unit Type Selection */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400">Type de Bien</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {unitTypes.map(type => (
                            <div 
                                key={type.id}
                                onClick={() => setFormData(prev => ({ ...prev, unit_category: type.id as any }))}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    formData.unit_category === type.id 
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md scale-105' 
                                    : 'border-slate-100 bg-slate-50 text-slate-400 grayscale hover:grayscale-0'
                                }`}
                            >
                                <span className="text-lg font-black leading-none">{type.icon}</span>
                                <span className="text-[8px] font-black uppercase mt-1 text-center leading-tight">{type.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Input 
                            label="Numéro ou Nom de l'Unité" 
                            placeholder="ex: Appt 402 ou Suite Ivoire" 
                            className="font-bold border-2"
                            required
                            value={formData.unit_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, unit_name: e.target.value }))}
                        />
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                <DollarSign size={10} /> Tarif Nuitée (FCFA)
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-lg font-black focus:border-emerald-500 outline-none transition-colors pr-12"
                                    placeholder="45 000"
                                    value={formData.base_price_per_night || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, base_price_per_night: Number(e.target.value) }))}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 underline decoration-emerald-200">XOF</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Caution de Garantie (Sécurité)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    required
                                    className="w-full bg-amber-50/50 border-2 border-amber-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-amber-500 outline-none transition-colors"
                                    placeholder="100 000"
                                    value={formData.caution_amount || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, caution_amount: Number(e.target.value) }))}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-600 italic">Remboursable</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Statut Initial</label>
                            <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none border-indigo-100"
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                            >
                                <option value="ready">PRÊT (Disponible)</option>
                                <option value="cleaning">EN MÉNAGE</option>
                                <option value="maintenance">MAINTENANCE</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-4">
                    <Info className="text-indigo-500 shrink-0" size={20} />
                    <div>
                        <p className="text-xs font-black text-indigo-900 uppercase tracking-tight">Note de Configuration</p>
                        <p className="text-[10px] text-indigo-700 font-medium leading-relaxed italic mt-1">
                            Les photos et l'inventaire détaillé (climatisation, literie, cuisine) pourront être ajoutés une fois l'unité créée dans le parc.
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <Button variant="outline" onClick={onCancel} className="font-black italic">ANNULER</Button>
                    <div className="flex gap-2">
                        <Button 
                            variant="primary" 
                            type="submit" 
                            className="px-10 font-black italic shadow-lg shadow-indigo-200"
                            isLoading={isSaving}
                        >
                            VALIDER L'UNITÉ
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
};

