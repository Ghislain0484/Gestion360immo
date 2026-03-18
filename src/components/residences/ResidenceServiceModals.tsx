import React, { useState } from 'react';
import { Plane, CheckCircle, Smartphone as Mobile, Info, Clock } from 'lucide-react';
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
    return (
        <Card className="p-8 border-0 shadow-2xl bg-white max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                    <Clock size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic">Politique de Prix</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Règles automatiques de réduction</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                            <p className="font-black text-slate-900">Seuil Long Séjour</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Nombres de nuitées minimum</p>
                        </div>
                        <input type="number" defaultValue="15" className="w-16 bg-white border-2 border-slate-200 rounded-xl px-2 py-2 text-center font-black focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                            <p className="font-black text-slate-900">Réduction (%)</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Appliquée si seuil atteint</p>
                        </div>
                        <input type="number" defaultValue="20" className="w-16 bg-white border-2 border-slate-200 rounded-xl px-2 py-2 text-center font-black focus:border-indigo-500 outline-none" />
                    </div>
                </div>

                <Card className="p-4 bg-gradient-to-br from-slate-900 to-indigo-900 text-white border-0">
                    <h4 className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-3 italic">Aperçu de la règle</h4>
                    <p className="text-xs font-bold leading-relaxed">
                        Le système appliquera automatiquement une remise de <span className="text-amber-400 text-sm">20%</span> sur le total dès que la durée du séjour dépasse <span className="text-amber-400 text-sm">15 nuits</span>.
                    </p>
                </Card>

                <div className="pt-4 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1 font-black italic">ANNULER</Button>
                    <Button variant="primary" onClick={() => {
                        toast.success('Règles de tarification mises à jour');
                        onClose();
                    }} className="flex-1 font-black italic bg-slate-900">ENREGISTRER</Button>
                </div>
            </div>
        </Card>
    );
};
