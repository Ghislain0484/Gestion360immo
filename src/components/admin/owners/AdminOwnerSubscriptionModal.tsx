import React, { useState } from 'react';
import { X, ShieldCheck, Calendar, AlertCircle, Save, Sparkles, Clock } from 'lucide-react';
import { supabase } from '../../../lib/config';
import { Owner } from '../../../types/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface AdminOwnerSubscriptionModalProps {
    isOpen: boolean;
    owner: Owner;
    onClose: () => void;
    onSuccess: () => void;
}

export const AdminOwnerSubscriptionModal: React.FC<AdminOwnerSubscriptionModalProps> = ({
    isOpen,
    owner,
    onClose,
    onSuccess
}) => {
    const [status, setStatus] = useState(owner.subscription_status);
    const [expiresAt, setExpiresAt] = useState(owner.subscription_expires_at ? owner.subscription_expires_at.split('T')[0] : '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('owners')
                .update({
                    subscription_status: status,
                    subscription_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', owner.id);

            if (error) throw error;

            toast.success('Compte propriétaire mis à jour avec succès');
            onSuccess();
        } catch (err) {
            console.error('Erreur mise à jour admin propriétaire:', err);
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addBonusMonths = (months: number) => {
        const baseDate = expiresAt ? new Date(expiresAt) : new Date();
        baseDate.setMonth(baseDate.getMonth() + months);
        setExpiresAt(baseDate.toISOString().split('T')[0]);
        setStatus('active');
        toast.success(`+${months} mois ajoutés !`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up">
                {/* Header Style Premium */}
                <div className="bg-slate-900 p-8 text-white relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full -mr-10 -mt-10" />
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic">Super-Pouvoirs Admin</h2>
                            <p className="text-white/50 text-[10px] uppercase font-bold tracking-[0.2em]">Pilotage centralisé</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* User Info Card */}
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-slate-400">
                             {owner.first_name[0]}{owner.last_name[0]}
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900">{owner.first_name} {owner.last_name}</p>
                            <p className="text-xs font-bold text-slate-400">{owner.email || owner.phone}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Status Selection */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Statut du compte</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setStatus('active')}
                                    className={clsx(
                                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                        status === 'active' ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-500/10" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    <Sparkles className={clsx("w-5 h-5", status === 'active' ? "text-emerald-500" : "text-slate-300")} />
                                    <span className="text-xs font-black uppercase tracking-tight">Actif (PRO)</span>
                                </button>
                                <button 
                                    onClick={() => setStatus('expired')}
                                    className={clsx(
                                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                        status === 'expired' ? "bg-rose-50 border-rose-500 text-rose-700 shadow-lg shadow-rose-500/10" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    <Clock className={clsx("w-5 h-5", status === 'expired' ? "text-rose-500" : "text-slate-300")} />
                                    <span className="text-xs font-black uppercase tracking-tight">Expiré</span>
                                </button>
                            </div>
                        </div>

                        {/* Date Selection */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Date d'expiration</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    type="date"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                    className="pl-12 bg-slate-50 border-none rounded-2xl h-14 font-bold text-slate-700"
                                />
                            </div>
                        </div>

                        {/* Quick Bonus Tokens */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Raccourcis Cadeaux</label>
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={() => addBonusMonths(1)}
                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                                >
                                    +1 Mois Offert
                                </button>
                                <button 
                                    onClick={() => addBonusMonths(6)}
                                    className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-amber-600 hover:text-white transition-all border border-amber-100"
                                >
                                    +6 Mois (Pack)
                                </button>
                                <button 
                                    onClick={() => addBonusMonths(12)}
                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                                >
                                    +1 An Offert
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button 
                            variant="outline" 
                            onClick={onClose}
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border-slate-200 text-slate-500"
                        >
                            Annuler
                        </Button>
                        <Button 
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="flex-1 h-14 rounded-2xl bg-slate-900 border-none font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-white"
                        >
                            {isSubmitting ? 'Enregistrement...' : (
                                <span className="flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Valider
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="p-4 bg-amber-50 text-amber-700 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold leading-relaxed uppercase">
                        Attention : Toute modification manuelle est enregistrée dans l'audit. Le propriétaire sera immédiatement informé de son nouveau statut Premium.
                    </p>
                </div>
            </div>
        </div>
    );
};
