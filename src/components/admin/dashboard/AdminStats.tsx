import React from 'react';
import { Building2, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { PlatformStats } from '../../../types/admin';
import clsx from 'clsx';

interface AdminStatsProps {
    stats: PlatformStats | null;
    loading?: boolean;
    pendingRequestsCount?: number;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ stats, loading, pendingRequestsCount = 0 }) => {
    if (loading || !stats) {
        return (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-none bg-white/90 shadow-md animate-pulse">
                        <div className="p-5 space-y-3">
                            <div className="h-10 w-10 bg-gray-200 rounded-xl" />
                            <div className="h-4 bg-gray-200 rounded w-24" />
                            <div className="h-6 bg-gray-200 rounded w-16" />
                            <div className="h-3 bg-gray-200 rounded w-32" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);

    const metrics = [
        {
            label: 'Agences actives',
            value: stats.activeAgencies.toLocaleString('fr-FR'),
            secondary: `${pendingRequestsCount} demandes en attente`,
            icon: Building2,
            gradient: 'from-blue-500 to-indigo-600',
            bgLight: 'bg-blue-500/10',
            trend: stats.activeAgencies > 0 ? '+' + Math.round((stats.activeAgencies / stats.totalAgencies) * 100) + '%' : null,
        },
        {
            label: 'Encaissements (Réels)',
            value: formatCurrency(stats.totalRevenue || 0),
            secondary: stats.totalRevenue === 0 && stats.subscriptionRevenue > 0 
                ? 'Période de grâce en cours' 
                : `Aujourd'hui: ${formatCurrency(stats.todayRevenue || 0)}`,
            icon: DollarSign,
            gradient: 'from-emerald-500 to-teal-600',
            bgLight: 'bg-emerald-500/10',
            trend: stats.todayRevenue > 0 ? 'positive' : null,
        },
        {
            label: 'Potentiel Mensuel (MRR)',
            value: formatCurrency(stats.subscriptionRevenue),
            secondary: `Projection annuelle: ${formatCurrency(stats.subscriptionRevenue * 12)}`,
            icon: TrendingUp,
            gradient: 'from-amber-500 to-orange-600',
            bgLight: 'bg-amber-500/10',
        },
        {
            label: 'Activité Plateforme',
            value: stats.totalProperties.toLocaleString('fr-FR'),
            secondary: `${stats.totalContracts.toLocaleString('fr-FR')} contrats créés`,
            icon: Building2,
            gradient: 'from-purple-500 to-pink-600',
            bgLight: 'bg-purple-500/10',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Alert Notification - Professional Glassmorphism */}
            {pendingRequestsCount > 0 && (
                <div className="group relative overflow-hidden rounded-3xl p-px bg-gradient-to-r from-amber-500/50 via-orange-500/50 to-amber-500/50">
                    <div className="relative flex items-center gap-4 bg-white/95 backdrop-blur-xl px-6 py-4 rounded-[23px] transition-all hover:bg-white/90">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 shadow-lg shadow-amber-500/30">
                            <AlertCircle className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-base font-bold text-slate-900">
                                {pendingRequestsCount} {pendingRequestsCount > 1 ? 'Nouvelles demandes' : 'Nouvelle demande'} d'inscription
                            </h4>
                            <p className="text-sm text-slate-500">
                                {pendingRequestsCount > 1 ? 'Plusieurs agences attendent' : 'Une agence attend'} votre revue immédiate pour activer son compte.
                            </p>
                        </div>
                        <Badge variant="warning" className="animate-pulse">Priorité Haute</Badge>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <div
                        key={metric.label}
                        className="group relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-6 shadow-sm shadow-slate-200/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    >
                        {/* Background subtle decoration */}
                        <div className={clsx(
                            "absolute -right-6 -top-6 h-24 w-24 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-20",
                            metric.bgLight
                        )} />

                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className={clsx(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg shadow-indigo-500/10 transition-transform duration-500 group-hover:scale-110",
                                    metric.gradient
                                )}>
                                    <metric.icon className="h-6 w-6 text-white" />
                                </div>
                                {metric.trend && typeof metric.trend === 'string' && metric.trend !== 'neutral' && (
                                    <div className={clsx(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold",
                                        metric.trend.startsWith('+') || metric.trend === 'positive'
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                            : "bg-rose-50 text-rose-600 border border-rose-100"
                                    )}>
                                        {metric.trend === 'positive' ? <TrendingUp className="h-3 w-3" /> : null}
                                        {metric.trend}
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">{metric.label}</p>
                                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{metric.value}</h3>
                                {metric.secondary && (
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                        <p className="text-xs font-medium text-slate-400">{metric.secondary}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
