import React, { useMemo } from 'react';
import { TrendingUp, CheckCircle, Clock, Building2, Wallet, AlertTriangle } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { useAgencies } from '../../../hooks/useAdminQueries';

export const ActiveSubscriptions: React.FC = () => {
    const { data: agencies = [], isLoading } = useAgencies();

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);

    const agencyMetrics = useMemo(() => {
        return agencies.map((agency) => {
            // Dans le futur, ces données viendront d'une vue SQL agrégée
            // Pour l'instant, on simule le potentiel basé sur le volume d'activité
            const potential = (((agency as any).monthly_fee || 75000)) * 20; // Simulation: le potentiel est ~20x l'ancien abonnement
            const commission = potential * 0.01;

            return {
                id: agency.id,
                name: agency.name,
                status: agency.subscription_status || 'active',
                potential: potential,
                commission: commission,
                walletBalance: (agency as any).wallet_balance || 0,
                lastActivity: agency.updated_at
            };
        });
    }, [agencies]);

    const totalGlobalPotential = useMemo(() => agencyMetrics.reduce((sum, a) => sum + a.potential, 0), [agencyMetrics]);
    const totalGlobalCommission = useMemo(() => agencyMetrics.reduce((sum, a) => sum + a.commission, 0), [agencyMetrics]);

    if (isLoading) {
        return (
            <Card className="border-none bg-white/90 shadow-md">
                <div className="p-6 space-y-4 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Recap Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-none shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Potentiel Global Sous Gestion</p>
                        <TrendingUp className="h-5 w-5 text-indigo-300" />
                    </div>
                    <h3 className="text-3xl font-black">{formatCurrency(totalGlobalPotential)}</h3>
                    <p className="text-indigo-200 text-xs mt-2 font-medium italic">Somme des baux actifs sur toute la plateforme</p>
                </Card>
                <Card className="p-6 bg-white border-none shadow-xl border-emerald-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest text-emerald-600">Revenus Fintech Attendus (1%)</p>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900">{formatCurrency(totalGlobalCommission)}</h3>
                    <p className="text-slate-400 text-xs mt-2 font-medium uppercase tracking-tighter">Prochaine facturation début de mois</p>
                </Card>
            </div>

            {/* Agency List */}
            <Card className="border-none bg-white/90 shadow-premium overflow-hidden">
                <div className="p-8 border-b border-slate-50">
                    <h3 className="text-xl font-black text-slate-900">Performance par Agence</h3>
                    <p className="text-sm text-slate-500 mt-1">Détails des commissions et santés financières des partenaires</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                            <tr>
                                <th className="px-8 py-4">Agence</th>
                                <th className="px-8 py-4">Status Fintech</th>
                                <th className="px-8 py-4">Potentiel Brut</th>
                                <th className="px-8 py-4">Commission (1%)</th>
                                <th className="px-8 py-4 text-right">Solde Portefeuille</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {agencyMetrics.map((agency) => (
                                <tr key={agency.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                                <Building2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-none mb-1">{agency.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Activité détectée le {new Date(agency.lastActivity).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {agency.status === 'active' ? (
                                            <Badge variant="success" size="sm">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                En règle
                                            </Badge>
                                        ) : (
                                            <Badge variant="warning" size="sm">
                                                <Clock className="h-3 w-3 mr-1" />
                                                Vérification
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="font-bold text-slate-700">{formatCurrency(agency.potential)}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Volume Baux</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            <p className="font-black text-emerald-600 text-lg">{formatCurrency(agency.commission)}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="inline-flex flex-col items-end">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black ${
                                                agency.walletBalance >= 0 ? 'bg-slate-100 text-slate-900' : 'bg-rose-50 text-rose-600'
                                            }`}>
                                                <Wallet className="h-4 w-4" />
                                                {formatCurrency(agency.walletBalance)}
                                            </div>
                                            {agency.walletBalance < 0 && (
                                                <p className="text-[9px] text-rose-500 font-black uppercase mt-1 flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Solde insuffisant
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ActiveSubscriptions;
