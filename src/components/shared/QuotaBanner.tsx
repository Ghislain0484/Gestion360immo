import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuotaManager } from '../../hooks/useQuotaManager';

export const QuotaBanner: React.FC = () => {
    const { stats, isOverLimit, isNearLimit, plan } = useQuotaManager();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = React.useState(true);

    if (!isVisible || (!isOverLimit && !isNearLimit)) return null;

    const getMessage = () => {
        if (stats.properties.isReached) return "Limite de propriétés atteinte !";
        if (stats.users.isReached) return "Limite d'utilisateurs atteinte !";
        if (stats.tenants.isReached) return "Limite de locataires atteinte !";
        return "Vous approchez de vos limites d'utilisation.";
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="relative z-[60] overflow-hidden"
            >
                <div className={`
                    w-full py-3 px-4 sm:px-6 lg:px-8
                    ${isOverLimit ? 'bg-gradient-to-r from-red-600 to-rose-700' : 'bg-gradient-to-r from-amber-500 to-orange-600'}
                    text-white shadow-lg
                `}>
                    <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-white/20 backdrop-blur-sm shadow-inner`}>
                                {isOverLimit ? (
                                    <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
                                ) : (
                                    <Zap className="h-5 w-5 text-white" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold tracking-tight">
                                    {getMessage()}
                                </span>
                                <span className="text-[11px] text-white/80 font-medium">
                                    Passez au pack supérieur pour continuer à développer votre activité sans interruption.
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/settings?tab=subscription')}
                                className="group flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-full text-xs font-black uppercase tracking-wider hover:bg-gray-100 transition-all shadow-premium"
                            >
                                Mettre à jour mon pack
                                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button 
                                onClick={() => setIsVisible(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
