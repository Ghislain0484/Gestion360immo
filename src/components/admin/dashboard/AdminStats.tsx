import React from 'react';
import { Building2, Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
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
            accent: 'bg-rose-100/70 text-rose-600',
            trend: stats.activeAgencies > 0 ? '+' + Math.round((stats.activeAgencies / stats.totalAgencies) * 100) + '%' : null,
        },
        {
            label: 'Revenus abonnements',
            value: formatCurrency(stats.subscriptionRevenue),
            secondary: `Total cumulé: ${formatCurrency(stats.totalRevenue)}`,
            icon: DollarSign,
            accent: 'bg-emerald-100/70 text-emerald-600',
            trend: stats.monthlyGrowth > 0 ? '+' + stats.monthlyGrowth + '%' : null,
        },
        {
            label: 'Biens gérés',
            value: stats.totalProperties.toLocaleString('fr-FR'),
            secondary: `${stats.totalContracts.toLocaleString('fr-FR')} contrats actifs`,
            icon: Users,
            accent: 'bg-blue-100/70 text-blue-600',
        },
        {
            label: 'Croissance mensuelle',
            value: `${stats.monthlyGrowth}%`,
            secondary: 'Tendance du mois courant',
            icon: TrendingUp,
            accent: 'bg-indigo-100/70 text-indigo-600',
            trend: stats.monthlyGrowth > 0 ? 'positive' : stats.monthlyGrowth < 0 ? 'negative' : 'neutral',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Alert si demandes en attente */}
            {pendingRequestsCount > 0 && (
                <Card className="border-l-4 border-l-orange-500 bg-orange-50/50">
                    <div className="p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div>
                            <p className="font-semibold text-orange-900">
                                {pendingRequestsCount} demande{pendingRequestsCount > 1 ? 's' : ''} en attente
                            </p>
                            <p className="text-sm text-orange-700">
                                {pendingRequestsCount > 1 ? 'Des agences attendent' : 'Une agence attend'} votre validation
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Métriques */}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <Card key={metric.label} className="border-none bg-white/90 shadow-md shadow-rose-200/40 hover:shadow-lg transition-shadow">
                        <div className="flex items-start gap-4 p-5">
                            <span className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', metric.accent)}>
                                <metric.icon className="h-5 w-5" />
                            </span>
                            <div className="flex-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-xl font-semibold text-slate-900">{metric.value}</p>
                                    {metric.trend && typeof metric.trend === 'string' && metric.trend !== 'neutral' && (
                                        <Badge
                                            variant={metric.trend === 'positive' ? 'success' : 'danger'}
                                            size="sm"
                                            className="text-xs"
                                        >
                                            {metric.trend}
                                        </Badge>
                                    )}
                                </div>
                                {metric.secondary && <p className="text-xs text-slate-500 mt-1">{metric.secondary}</p>}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
