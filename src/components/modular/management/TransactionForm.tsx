import React, { useState, useEffect } from 'react';
import { Receipt, X, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { dbService } from '../../../lib/supabase';
import { ModularTransaction, ResidenceSite, ModuleType } from '../../../types/modular';
import toast from 'react-hot-toast';

interface TransactionFormProps {
    transaction?: ModularTransaction | null;
    moduleType?: ModuleType;
    onClose: () => void;
    onSuccess: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ transaction, moduleType, onClose, onSuccess }) => {
    const { agencyId, user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [sites, setSites] = useState<ResidenceSite[]>([]);

    const [formData, setFormData] = useState({
        type: (transaction?.type || 'expense') as ModularTransaction['type'],
        category: transaction?.category || '',
        amount: transaction?.amount || 0,
        description: transaction?.description || '',
        transaction_date: transaction?.transaction_date ? new Date(transaction.transaction_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        payment_method: transaction?.payment_method || 'Espèces',
        site_id: transaction?.site_id || ''
    });

    useEffect(() => {
        if (agencyId) {
            fetchSites();
        }
    }, [agencyId]);

    const fetchSites = async () => {
        try {
            const data = await dbService.modular.getSites(agencyId!);
            setSites(data);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agencyId) return;
        if (formData.amount <= 0) {
            toast.error('Le montant doit être supérieur à 0');
            return;
        }

        try {
            setIsSaving(true);
            const payload = {
                ...formData,
                agency_id: agencyId,
                created_by: user?.id,
                site_id: formData.site_id || undefined,
                module_type: moduleType,
                transaction_date: new Date(formData.transaction_date).toISOString()
            };

            if (transaction) {
                // await dbService.modular.updateTransaction(transaction.id, payload);
                // toast.success('Mouvement modifié');
                toast.error('La modification n\'est pas encore implémentée');
            } else {
                await dbService.modular.createTransaction(payload);
                toast.success('Mouvement de caisse enregistré');
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving transaction:', error);
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setIsSaving(false);
        }
    };

    const types = [
        { id: 'income', label: 'Entrée (Revenu)', icon: <ArrowUpRight size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'expense', label: 'Sortie (Charge)', icon: <ArrowDownLeft size={14} />, color: 'text-rose-600', bg: 'bg-rose-50' },
        { id: 'salary', label: 'Salaire', icon: <Wallet size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'deposit', label: 'Dépôt Bancaire', icon: <TrendingUp size={14} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Card className="p-0 border-0 shadow-2xl bg-white overflow-hidden max-w-lg w-full">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
                        <Receipt size={20} className="text-primary-400" />
                        {transaction ? 'Modifier le Mouvement' : 'Nouveau Mouvement de Caisse'}
                    </h3>
                    <button onClick={onClose} className="hover:rotate-90 transition-transform">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nature de l'opération</label>
                        <div className="grid grid-cols-2 gap-2">
                            {types.map(t => (
                                <div 
                                    key={t.id}
                                    onClick={() => setFormData(prev => ({ ...prev, type: t.id as any }))}
                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                        formData.type === t.id 
                                        ? `${t.bg} border-slate-900 shadow-sm` 
                                        : 'bg-white border-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    <div className={`${t.color}`}>{t.icon}</div>
                                    <span className={`text-[10px] font-black uppercase ${formData.type === t.id ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {t.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Montant (FCFA)" 
                            type="number" 
                            required 
                            min="0"
                            value={formData.amount}
                            onChange={e => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                            className="text-lg font-black italic"
                        />
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mode de Paiement</label>
                            <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                                value={formData.payment_method}
                                onChange={e => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                            >
                                <option value="Espèces">Espèces (Cash)</option>
                                <option value="Mobile Money">Mobile Money</option>
                                <option value="Virement">Virement Bancaire</option>
                                <option value="Chèque">Chèque</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date de l'opération</label>
                            <input 
                                type="date"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                                value={formData.transaction_date}
                                onChange={e => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lien avec un Site (Optionnel)</label>
                            <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                                value={formData.site_id}
                                onChange={e => setFormData(prev => ({ ...prev, site_id: e.target.value }))}
                            >
                                <option value="">Aucun site particulier</option>
                                {sites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <Input 
                        label="Catégorie / Libellé" 
                        placeholder="ex: Facture CIE, Achat fournitures, etc." 
                        required 
                        value={formData.category}
                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    />

                    <Input 
                        label="Description additionnelle" 
                        placeholder="Détails du mouvement..." 
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />

                    <div className="pt-4 flex gap-3">
                        <Button variant="outline" type="button" onClick={onClose} className="flex-1 font-black italic uppercase">Annuler</Button>
                        <Button 
                            variant="primary" 
                            type="submit" 
                            isLoading={isSaving} 
                            className="flex-1 font-black italic uppercase bg-slate-900 hover:bg-black text-white"
                        >
                            Enregistrer le Mouvement
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
