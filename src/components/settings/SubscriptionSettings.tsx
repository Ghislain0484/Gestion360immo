import React from 'react';
import { Sparkles, CheckCircle, ShieldCheck, HeartHandshake, Zap, Building2, Users2, ShieldAlert } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useQuotaManager } from '../../hooks/useQuotaManager';

export const SubscriptionSettings: React.FC = () => {
    const { stats } = useQuotaManager();

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-8 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
                            Facturation de Performance
                        </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">Abonnement &amp; Facturation</h3>
                    <p className="text-sm text-slate-500 mt-1">Votre agence bénéficie du modèle de croissance illimitée Fintech à 1%.</p>
                </div>
                <div>
                    <Badge variant="success" className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm animate-pulse">
                        Modèle 1% Fintech Actif
                    </Badge>
                </div>
            </div>

            {/* Premium main card */}
            <Card className="overflow-hidden border-none bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
                <div className="relative z-10 p-8 md:p-10">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                                <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
                                Zéro abonnement fixe
                            </div>
                            <h4 className="text-4xl font-black tracking-tight leading-none">
                                Croissance <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Sans Limite</span>
                            </h4>
                            <p className="max-w-xl text-slate-300 text-base font-medium">
                                Pas de forfaits contraignants, pas de limites artificielles. Développez votre portefeuille immobilier à votre rythme en toute sérénité.
                            </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                            <div className="text-right">
                                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Abonnement mensuel</p>
                                <div className="text-5xl font-black text-emerald-400">0 FCFA</div>
                                <p className="text-[10px] text-slate-400 mt-1 italic">Mises à jour et support inclus à vie</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors duration-300">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-300">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <h5 className="font-bold text-slate-200">Biens Immobiliers</h5>
                            </div>
                            <p className="text-2xl font-black text-white">{stats.properties.current} <span className="text-sm font-semibold text-emerald-400">/ Illimité</span></p>
                            <p className="text-xs text-slate-400 mt-1">Ajoutez autant de biens que souhaité</p>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors duration-300">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-300">
                                    <Users2 className="h-5 w-5" />
                                </div>
                                <h5 className="font-bold text-slate-200">Locataires Actifs</h5>
                            </div>
                            <p className="text-2xl font-black text-white">{stats.tenants.current} <span className="text-sm font-semibold text-emerald-400">/ Illimité</span></p>
                            <p className="text-xs text-slate-400 mt-1">Suivi de bail complet et sans quota</p>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors duration-300">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-300">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <h5 className="font-bold text-slate-200">Accès Utilisateurs</h5>
                            </div>
                            <p className="text-2xl font-black text-white">{stats.users.current} <span className="text-sm font-semibold text-emerald-400">/ Illimité</span></p>
                            <p className="text-xs text-slate-400 mt-1">Collaborez avec tous vos agents</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Model details / explanation section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                <Card className="border-none bg-white shadow-md p-6 space-y-4">
                    <div className="flex items-center gap-3 text-slate-900 font-bold text-lg mb-2">
                        <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        <span>Fonctionnement de la Commission 1%</span>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-start text-sm text-slate-600 gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span><strong>0% de commission sur les espèces :</strong> Les encaissements effectués manuellement en espèces ou par chèque en agence sont 100% gratuits.</span>
                        </li>
                        <li className="flex items-start text-sm text-slate-600 gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span><strong>1% sur le numérique :</strong> Seuls les paiements des loyers effectués directement via les moyens de paiement intégrés (Mobile Money Orange, MTN, Moov, Wave, ou Virement) sont commissionnés à hauteur de 1%.</span>
                        </li>
                        <li className="flex items-start text-sm text-slate-600 gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span><strong>Prélèvement direct et sécurisé :</strong> Les frais de 1% sont automatiquement prélevés lors du traitement numérique, garantissant une transparence totale sans facture mensuelle à régler.</span>
                        </li>
                    </ul>
                </Card>

                <Card className="border-none bg-white shadow-md p-6 space-y-4">
                    <div className="flex items-center gap-3 text-slate-900 font-bold text-lg mb-2">
                        <HeartHandshake className="h-6 w-6 text-indigo-500" />
                        <span>Engagements de Gestion360Immo</span>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-start text-sm text-slate-600 gap-2">
                            <CheckCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span><strong>Sécurité maximale :</strong> Vos flux de paiement sont cryptés et stockés conformément aux normes bancaires internationales.</span>
                        </li>
                        <li className="flex items-start text-sm text-slate-600 gap-2">
                            <CheckCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span><strong>Aucun engagement :</strong> Vous êtes libre d'utiliser la plateforme à tout moment, sans contrat de durée obligatoire.</span>
                        </li>
                        <li className="flex items-start text-sm text-slate-600 gap-2">
                            <CheckCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span><strong>Support Prioritaire Inclus :</strong> Bénéficiez d'une assistance réactive 7j/7 pour la gestion de vos comptes et de vos propriétaires.</span>
                        </li>
                    </ul>
                </Card>
            </div>

            {/* Note alert */}
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3 mt-8">
                <ShieldAlert className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-sm text-indigo-900">
                    <p className="font-bold mb-1">Mises à jour régulières</p>
                    <p>
                        Notre équipe déploie continuellement de nouvelles fonctionnalités. En tant que partenaire Fintech, vous bénéficiez automatiquement de toutes les mises à jour majeures, outils d'automatisation des relances et modules propriétaires sans surcoût.
                    </p>
                </div>
            </div>
            
            <style>{`
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};
