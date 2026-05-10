import React from 'react';
import { TrendingUp, ShieldCheck, Zap, BarChart3, Building2, DollarSign } from 'lucide-react';
import { Card } from '../../ui/Card';

export const SubscriptionPlans: React.FC = () => {
    return (
        <div className="space-y-10 animate-slide-up">
            {/* Hero Section - Fintech Model */}
            <div className="relative group overflow-hidden rounded-[40px] p-px bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl">
                <div className="relative bg-white/90 backdrop-blur-xl p-10 md:p-16 rounded-[39px]">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="h-1.5 w-12 rounded-full bg-indigo-600" />
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em]">Business Model Evolution</span>
                        </div>
                        <h3 className="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                            Modèle de Croissance <br />
                            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Fintech à 1%</span>
                        </h3>
                        <p className="text-slate-600 text-xl font-medium leading-relaxed mb-10">
                            Gestion360 bascule vers un modèle basé sur la performance. Fini les abonnements fixes : nous grandissons avec vous. Nous percevons une commission de 1% sur le potentiel brut de vos biens occupés.
                        </p>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Agilité</p>
                                    <p className="text-sm font-bold text-emerald-900">0 FCFA de frais fixes</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Équité</p>
                                    <p className="text-sm font-bold text-indigo-900">Payez sur le potentiel réel</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* How it works */}
            <div className="grid md:grid-cols-3 gap-8">
                <Card className="p-8 border-none shadow-xl bg-white hover:shadow-2xl transition-all duration-500">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Building2 className="h-7 w-7 text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-3">1. Identification des actifs</h4>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Le système identifie automatiquement tous vos baux en cours de validité (biens occupés).
                    </p>
                </Card>

                <Card className="p-8 border-none shadow-xl bg-white hover:shadow-2xl transition-all duration-500">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <BarChart3 className="h-7 w-7 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-3">2. Calcul du potentiel</h4>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Le CA potentiel est la somme des loyers mensuels de ces baux, indépendamment des encaissements réels.
                    </p>
                </Card>

                <Card className="p-8 border-none shadow-xl bg-white hover:shadow-2xl transition-all duration-500">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <DollarSign className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-3">3. Commission 1%</h4>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Une commission de 1% est calculée et prélevée sur votre portefeuille GESTION360 chaque début de mois.
                    </p>
                </Card>
            </div>

            {/* Transparency Note */}
            <div className="p-8 rounded-[32px] bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="h-20 w-20 rounded-[24px] bg-white/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-10 w-10 text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-2xl font-bold mb-2">Transparence Totale</h4>
                        <p className="text-slate-400 max-w-2xl font-medium">
                            Ce modèle incite GESTION360 à vous fournir les meilleurs outils pour augmenter votre taux d'occupation. 
                            Plus vous avez de locataires actifs, plus nous prospérons ensemble.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPlans;
