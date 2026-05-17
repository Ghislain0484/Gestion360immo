import React, { useState } from 'react';
import { Plane, CheckCircle, Smartphone as Mobile, Info, Clock, Percent, Sparkles, Save, Shield } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import toast from 'react-hot-toast';

interface ModalProps {
    onClose: () => void;
}

export const ShuttleRequestModal: React.FC<ModalProps> = ({ onClose }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            toast.success('Demande de navette enregistrée. Notre chauffeur vous contactera.');
            setIsSubmitting(false);
            onClose();
        }, 1500);
    };

    return (
        <Card className="p-8 border-0 shadow-2xl bg-white max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                    <Plane size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic">Navette Aéroport VIP</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Aéroport Félix Houphouët-Boigny (DIAP)</p>
                </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
                <Input label="Numéro de Vol" placeholder="ex: AF702" required />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Date d'arrivée" type="date" required />
                    <Input label="Heure" type="time" required />
                </div>
                <Input label="Nombre de Passagers" type="number" min="1" max="10" defaultValue="1" required />
                
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 mt-4">
                    <Info size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed italic">
                        Une pancarte au nom du client sera tenue par notre chauffeur à la sortie des passagers.
                    </p>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button variant="outline" type="button" onClick={onClose} className="flex-1 font-black italic">ANNULER</Button>
                    <Button variant="primary" type="submit" isLoading={isSubmitting} className="flex-1 font-black italic bg-indigo-600">RESERVER</Button>
                </div>
            </form>
        </Card>
    );
};

export const MobileMoneyModal: React.FC<ModalProps> = ({ onClose }) => {
    const [selectedMethod, setSelectedMethod] = useState<'wave' | 'orange' | 'mtn' | null>(null);

    const methods = [
        { id: 'wave', name: 'Wave CI', color: 'bg-sky-500', logo: '🌊', description: '0% de frais' },
        { id: 'orange', name: 'Orange Money', color: 'bg-orange-500', logo: '🍊', description: 'Retrait facile' },
        { id: 'mtn', name: 'MTN MoMo', color: 'bg-yellow-400', logo: '📱', description: 'Rapide & Fiable' },
    ];

    return (
        <Card className="p-8 border-0 shadow-2xl bg-white max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                    <Mobile size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic">Paiement Mobile Money</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Sélectionnez votre opérateur</p>
                </div>
            </div>

            <div className="space-y-3">
                {methods.map(m => (
                    <div 
                        key={m.id}
                        onClick={() => setSelectedMethod(m.id as any)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedMethod === m.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${m.color} rounded-xl shadow-sm flex items-center justify-center text-xl`}>
                                {m.logo}
                            </div>
                            <div>
                                <p className="font-black text-slate-900 leading-none">{m.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">{m.description}</p>
                            </div>
                        </div>
                        {selectedMethod === m.id && <CheckCircle size={20} className="text-emerald-500" />}
                    </div>
                ))}
            </div>

            {selectedMethod && (
                <div className="mt-6 p-4 bg-slate-900 rounded-2xl text-white animate-in zoom-in-95 duration-300">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Instructions de paiement</p>
                    <div className="space-y-2">
                        <p className="text-sm font-bold">1. Composez le code USSD sur votre mobile</p>
                        <p className="text-xs opacity-80 bg-white/10 p-2 rounded-lg font-mono">
                            {selectedMethod === 'wave' ? 'Ouvrez l\'application Wave CI' : selectedMethod === 'orange' ? '#144*77#' : '*133#'}
                        </p>
                        <p className="text-sm font-bold mt-3">2. Saisissez le montant et votre code secret</p>
                        <p className="text-sm font-bold mt-3">3. Validez la transaction</p>
                    </div>
                </div>
            )}

            <div className="pt-6">
                <Button variant="primary" onClick={onClose} className="w-full font-black italic bg-emerald-600">FERMER</Button>
            </div>
        </Card>
    );
};

export const PricingPolicyModal: React.FC<ModalProps> = ({ onClose }) => {
    const [threshold, setThreshold] = useState<number>(() => {
        const saved = localStorage.getItem('residence_long_stay_threshold');
        return saved ? Number(saved) : 15;
    });
    const [discount, setDiscount] = useState<number>(() => {
        const saved = localStorage.getItem('residence_long_stay_discount');
        return saved ? Number(saved) : 20;
    });

    const handleSave = () => {
        if (threshold <= 0) {
            toast.error('Le seuil doit être d\'au moins 1 nuité');
            return;
        }
        if (discount < 0 || discount > 100) {
            toast.error('Le pourcentage de réduction doit être compris entre 0 et 100%');
            return;
        }

        localStorage.setItem('residence_long_stay_threshold', String(threshold));
        localStorage.setItem('residence_long_stay_discount', String(discount));
        
        toast.success('Règles de tarification enregistrées !');
        onClose();
        
        // Refresh dynamically to reload the context of all active panels
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    return (
        <Card className="p-8 border-0 shadow-2xl bg-white dark:bg-gray-900 max-w-md mx-auto relative overflow-hidden rounded-3xl">
            {/* Elegant glowing background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="p-3.5 bg-gradient-to-tr from-indigo-650 to-indigo-500 rounded-2xl text-white shadow-md shadow-indigo-100 dark:shadow-none">
                    <Clock size={24} className="animate-pulse" />
                </div>
                <div>
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">Configuration PMS</span>
                    <h3 className="text-xl font-black uppercase tracking-tight italic text-slate-855 dark:text-gray-150 mt-0.5">Politique de Prix</h3>
                </div>
            </div>

            <div className="space-y-6 relative z-10">
                <div className="space-y-4">
                    {/* Seuil Long Séjour Card */}
                    <div className="flex items-center justify-between p-4.5 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border-2 border-slate-100/80 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900/40 focus-within:border-indigo-500 transition-all duration-300">
                        <div className="space-y-1 pr-2">
                            <p className="font-extrabold text-sm text-slate-800 dark:text-gray-205 flex items-center gap-1.5">
                                <Shield size={14} className="text-indigo-500" />
                                Seuil Long Séjour
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Nombres de nuitées minimum</p>
                        </div>
                        <input 
                            type="number" 
                            min="1"
                            value={threshold} 
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="w-18 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl px-2 py-2.5 text-center text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
                        />
                    </div>

                    {/* Pourcentage de Réduction Card */}
                    <div className="flex items-center justify-between p-4.5 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border-2 border-slate-100/80 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900/40 focus-within:border-indigo-500 transition-all duration-300">
                        <div className="space-y-1 pr-2">
                            <p className="font-extrabold text-sm text-slate-800 dark:text-gray-205 flex items-center gap-1.5">
                                <Percent size={14} className="text-indigo-500" />
                                Réduction (%)
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Appliquée si seuil atteint</p>
                        </div>
                        <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={discount} 
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            className="w-18 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl px-2 py-2.5 text-center text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
                        />
                    </div>
                </div>

                {/* Animated visual rule preview with HSL tailoured gold details */}
                <Card className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-0 shadow-lg relative overflow-hidden rounded-2xl">
                    <div className="absolute top-0 right-0 p-3 opacity-25">
                        <Sparkles size={36} className="text-amber-400 animate-pulse" />
                    </div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-2.5 italic flex items-center gap-1">
                        <Sparkles size={10} className="text-amber-450" />
                        Aperçu de la règle
                    </h4>
                    <p className="text-xs font-bold leading-relaxed opacity-95">
                        Le système appliquera automatiquement une remise de{' '}
                        <span className="text-amber-400 font-black text-sm px-2 py-0.5 bg-amber-400/15 rounded-lg border border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.15)] inline-block">
                            {discount}%
                        </span>{' '}
                        sur le montant total dès que la durée du séjour dépasse{' '}
                        <span className="text-amber-400 font-black text-sm px-2 py-0.5 bg-amber-400/15 rounded-lg border border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.15)] inline-block">
                            {threshold} nuits
                        </span>.
                    </p>
                </Card>

                {/* Button actions */}
                <div className="pt-4 flex gap-4">
                    <Button 
                        variant="outline" 
                        onClick={onClose} 
                        className="flex-1 font-black italic rounded-xl border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                        ANNULER
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSave} 
                        className="flex-1 font-black italic bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-150 transition-all rounded-xl flex items-center justify-center gap-2"
                    >
                        <Save size={16} />
                        ENREGISTRER
                    </Button>
                </div>
            </div>
        </Card>
    );
};
