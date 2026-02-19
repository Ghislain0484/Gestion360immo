import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card } from '../../ui/Card';
import { PlatformStats } from '../../../types/admin';

interface RevenueChartProps {
    stats: PlatformStats | null;
    loading?: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ stats, loading }) => {
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);

    const revenueData = useMemo(() => {
        if (!stats) return null;

        return {
            total: stats.totalRevenue,
            subscription: stats.subscriptionRevenue,
            growth: stats.monthlyGrowth,
            avgPerAgency: stats.activeAgencies > 0 ? stats.subscriptionRevenue / stats.activeAgencies : 0,
        };
    }, [stats]);

    if (loading || !revenueData) {
        return (
            <Card className="border-none bg-white/90 shadow-md">
                <div className="p-6 space-y-4 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48" />
                    <div className="h-32 bg-gray-100 rounded-xl" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-16 bg-gray-100 rounded-lg" />
                        <div className="h-16 bg-gray-100 rounded-lg" />
                    </div>
                </div>
            </Card>
        );
    }

    const isPositiveGrowth = revenueData.growth >= 0;

    return (
        <Card className="border-none bg-white/90 shadow-md">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Revenus de la plateforme</h3>
                        <p className="text-sm text-slate-500">Analyse financière</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isPositiveGrowth ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {isPositiveGrowth ? (
                            <TrendingUp className="h-4 w-4" />
                        ) : (
                            <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-sm">{revenueData.growth}%</span>
                    </div>
                </div>

                {/* Revenus principaux */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="h-6 w-6 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-900">Revenus totaux</p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-900">{formatCurrency(revenueData.total)}</p>
                    <p className="text-sm text-emerald-700 mt-1">Depuis le lancement de la plateforme</p>
                </div>

                {/* Statistiques détaillées */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                            Abonnements mensuels
                        </p>
                        <p className="text-lg font-semibold text-slate-900">{formatCurrency(revenueData.subscription)}</p>
                        <p className="text-xs text-slate-500 mt-1">Revenus récurrents</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                            Moyenne par agence
                        </p>
                        <p className="text-lg font-semibold text-slate-900">{formatCurrency(revenueData.avgPerAgency)}</p>
                        <p className="text-xs text-slate-500 mt-1">Revenu moyen</p>
                    </div>
                </div>

                {/* Barre de progression visuelle */}
                <div className="mt-6">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                        <span>Progression vers l'objectif</span>
                        <span className="font-semibold">
                            {Math.min(100, Math.round((revenueData.subscription / 10000000) * 100))}%
                        </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (revenueData.subscription / 10000000) * 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Objectif mensuel : 10,000,000 FCFA</p>
                </div>
            </div>
        </Card>
    );
};
