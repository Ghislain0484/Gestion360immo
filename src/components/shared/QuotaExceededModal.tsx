import React from 'react';
import { ShieldAlert, Zap, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface QuotaExceededModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'properties' | 'tenants' | 'users';
    currentLimit: number;
}

export const QuotaExceededModal: React.FC<QuotaExceededModalProps> = ({ 
    isOpen, onClose, type, currentLimit 
}) => {
    const typeLabel = {
        properties: 'biens immobiliers',
        tenants: 'locataires',
        users: 'utilisateurs'
    }[type];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Limite du pack atteinte"
            size="md"
        >
            <div className="p-2 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 mb-6">
                    <ShieldAlert className="h-10 w-10 text-amber-600" />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 mb-2">Passez au niveau supérieur !</h3>
                <p className="text-slate-500 mb-8 px-4">
                    Vous avez atteint la limite de <span className="font-bold text-indigo-600">{currentLimit} {typeLabel}</span> de votre pack actuel. 
                    Pour continuer à développer votre activité, passez au pack Premium.
                </p>

                <div className="grid gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 text-left">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                            <Zap className="h-3 w-3" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Gestion jusqu'à 50 biens et locataires</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-1 h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                            <Zap className="h-3 w-3" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Multi-utilisateurs (jusqu'à 5 accès)</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-1 h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                            <Zap className="h-3 w-3" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Support prioritaire et rapports détaillés</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <Button 
                        variant="primary" 
                        className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20"
                        onClick={() => {
                            // Redirection vers la page d'abonnement ou contact admin
                            window.location.href = '/settings?tab=subscription';
                        }}
                    >
                        Passez au pack Premium
                    </Button>
                    <Button variant="ghost" className="w-full text-slate-400" onClick={onClose}>
                        Plus tard
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
