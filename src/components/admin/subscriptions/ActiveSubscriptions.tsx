import React, { useMemo } from 'react';
import { Calendar, AlertCircle, CheckCircle, Clock, Building2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { useAgencies } from '../../../hooks/useAdminQueries';

export const ActiveSubscriptions: React.FC = () => {
    const { data: agencies = [], isLoading } = useAgencies();

    // Transformer les agences en abonnements avec calculs mémoïsés
    const subscriptions = useMemo(() => {
        return agencies.map((agency) => ({
            id: agency.id,
            agency_id: agency.id,
            agency_name: agency.name,
            plan_type: agency.plan_type || 'basic',
            status: agency.subscription_status || 'active',
            start_date: agency.created_at,
            end_date: new Date(
                new Date(agency.created_at).setFullYear(new Date(agency.created_at).getFullYear() + 1)
            ).toISOString(),
            monthly_fee: agency.monthly_fee || 0,
        }));
    }, [agencies]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            active: { variant: 'success', label: 'Actif', icon: CheckCircle },
            trial: { variant: 'secondary', label: 'Essai', icon: Clock },
            suspended: { variant: 'warning', label: 'Suspendu', icon: AlertCircle },
            cancelled: { variant: 'danger', label: 'Annulé', icon: AlertCircle },
        };
        const config = variants[status] || { variant: 'secondary', label: status, icon: AlertCircle };
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} size="sm">
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
            </Badge>
        );
    };

    const getDaysUntilExpiry = (endDate: string) => {
        const days = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const expiringSubscriptions = useMemo(
        () => subscriptions.filter((sub) => sub.status === 'active' && getDaysUntilExpiry(sub.end_date) <= 30),
        [subscriptions]
    );

    const activeSubscriptions = useMemo(
        () => subscriptions.filter((s) => s.status === 'active'),
        [subscriptions]
    );

    const totalRevenue = useMemo(
        () => subscriptions.reduce((sum, sub) => sum + sub.monthly_fee, 0),
        [subscriptions]
    );

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
        <div className="space-y-6">
            {/* Alertes d'expiration */}
            {expiringSubscriptions.length > 0 && (
                <Card className="border-l-4 border-l-orange-500 bg-orange-50/50">
                    <div className="p-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            <div>
                                <p className="font-semibold text-orange-900">
                                    {expiringSubscriptions.length} abonnement
                                    {expiringSubscriptions.length > 1 ? 's' : ''} expire
                                    {expiringSubscriptions.length > 1 ? 'nt' : ''} bientôt
                                </p>
                                <p className="text-sm text-orange-700">Vérifiez les renouvellements à venir</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Liste des abonnements actifs */}
            <Card className="border-none bg-white/90 shadow-md">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Abonnements actifs</h3>
                            <p className="text-sm text-slate-500">
                                {activeSubscriptions.length} abonnements actifs
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Revenus mensuels</p>
                            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
                        </div>
                    </div>

                    {subscriptions.length > 0 ? (
                        <div className="space-y-3">
                            {subscriptions.map((sub) => {
                                const daysUntilExpiry = getDaysUntilExpiry(sub.end_date);
                                const isExpiringSoon = daysUntilExpiry <= 30 && sub.status === 'active';

                                return (
                                    <div
                                        key={sub.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border ${isExpiringSoon
                                                ? 'border-orange-200 bg-orange-50'
                                                : 'border-slate-100 bg-slate-50'
                                            } hover:bg-slate-100 transition-colors`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                                                <Building2 className="h-5 w-5 text-slate-600" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-slate-900">{sub.agency_name}</p>
                                                    {getStatusBadge(sub.status)}
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
                                                        {sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>
                                                            Expire le {new Date(sub.end_date).toLocaleDateString('fr-FR')}
                                                        </span>
                                                    </div>
                                                    {isExpiringSoon && (
                                                        <span className="text-orange-600 font-medium">
                                                            ({daysUntilExpiry} jours restants)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-900">
                                                {formatCurrency(sub.monthly_fee)}
                                            </p>
                                            <p className="text-xs text-slate-500">par mois</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Aucun abonnement actif</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default ActiveSubscriptions;
