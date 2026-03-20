import React, { useState } from 'react';
import { User, Phone, Mail, Globe, CreditCard, Star, Save, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { ModularClientFormData } from '../../../types/modular';

interface ClientFormProps {
    initialData?: Partial<ModularClientFormData>;
    onSubmit: (data: ModularClientFormData) => Promise<void>;
    onCancel: () => void;
    isSaving?: boolean;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSubmit, onCancel, isSaving }) => {
    const [formData, setFormData] = useState<ModularClientFormData>({
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        client_type: initialData?.client_type || 'regular',
        loyalty_points: initialData?.loyalty_points || 0,
        preferences: initialData?.preferences || [],
        nationality: initialData?.nationality || 'Ivoirienne',
        id_card_number: initialData?.id_card_number || '',
        id_card_url: initialData?.id_card_url || '',
        agency_id: initialData?.agency_id || ''
    });

    const [prefInput, setPrefInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const addPreference = () => {
        if (prefInput.trim() && !formData.preferences.includes(prefInput.trim())) {
            setFormData(prev => ({
                ...prev,
                preferences: [...prev.preferences, prefInput.trim()]
            }));
            setPrefInput('');
        }
    };

    const removePreference = (pref: string) => {
        setFormData(prev => ({
            ...prev,
            preferences: prev.preferences.filter(p => p !== pref)
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <User size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase italic">Profil du Résident</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informations du client Hotel & Résidence</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Prénom" 
                    required 
                    value={formData.first_name}
                    onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                />
                <Input 
                    label="Nom" 
                    required 
                    value={formData.last_name}
                    onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Téléphone" 
                    required 
                    leftIcon={<Phone size={14} />}
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
                <Input 
                    label="Email" 
                    type="email"
                    leftIcon={<Mail size={14} />}
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Statut Client</label>
                    <select 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500"
                        value={formData.client_type}
                        onChange={e => setFormData(prev => ({ ...prev, client_type: e.target.value as any }))}
                    >
                        <option value="regular">Standard (Regular)</option>
                        <option value="vip">VIP (Premium)</option>
                        <option value="corporate">Corporate (Entreprise)</option>
                    </select>
                </div>
                <Input 
                    label="Nationalité" 
                    leftIcon={<Globe size={14} />}
                    value={formData.nationality}
                    onChange={e => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="N° Pièce d'identité" 
                    leftIcon={<CreditCard size={14} />}
                    value={formData.id_card_number}
                    onChange={e => setFormData(prev => ({ ...prev, id_card_number: e.target.value }))}
                />
                <Input 
                    label="Points Initiaux" 
                    type="number"
                    leftIcon={<Star size={14} />}
                    value={formData.loyalty_points}
                    onChange={e => setFormData(prev => ({ ...prev, loyalty_points: parseInt(e.target.value) || 0 }))}
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Préférences spécifiques</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="ex: Étage élevé, Sans gluten..."
                        value={prefInput}
                        onChange={e => setPrefInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addPreference())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addPreference}>Ajouter</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {formData.preferences.map(pref => (
                        <span key={pref} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase border border-indigo-100">
                            {pref}
                            <button type="button" onClick={() => removePreference(pref)}><X size={10} /></button>
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={onCancel}>Annuler</Button>
                <Button variant="primary" type="submit" isLoading={isSaving} leftIcon={<Save size={16} />}>
                    Enregistrer le Client
                </Button>
            </div>
        </form>
    );
};
