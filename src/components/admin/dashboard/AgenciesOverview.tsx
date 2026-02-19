import React from 'react';
import { Building2, MapPin, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Agency } from '../../../types/db';

interface AgenciesOverviewProps {
    agencies: Agency[];
    loading?: boolean;
}

export const AgenciesOverview: React.FC<AgenciesOverviewProps> = ({ agencies, loading }) => {
    if (loading) {
        return (
            <Card className="border-none bg-white/90 shadow-md">
                <div className="p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="success" size="sm">Active</Badge>;
            case 'suspended':
                return <Badge variant="warning" size="sm">Suspendue</Badge>;
            case 'trial':
                return <Badge variant="secondary" size="sm">Essai</Badge>;
            default:
                return <Badge variant="secondary" size="sm">{status}</Badge>;
        }
    };

    const getPlanBadge = (plan: string) => {
        const colors: Record<string, string> = {
            basic: 'bg-gray-100 text-gray-700',
            premium: 'bg-blue-100 text-blue-700',
            enterprise: 'bg-purple-100 text-purple-700',
        };
        return (
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${colors[plan] || colors.basic}`}>
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
        );
    };

    return (
        <Card className="border-none bg-white/90 shadow-md">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Agences récentes</h3>
                        <p className="text-sm text-slate-500">Dernières agences inscrites</p>
                    </div>
                    <Badge variant="secondary">{agencies.length} agences</Badge>
                </div>

                {agencies.length > 0 ? (
                    <div className="space-y-3">
                        {agencies.slice(0, 6).map((agency) => (
                            <div
                                key={agency.id}
                                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                                        <Building2 className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate">{agency.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            <MapPin className="h-3 w-3" />
                                            <span>{agency.city}</span>
                                            {agency.subscription_status && (
                                                <>
                                                    <span>•</span>
                                                    {getStatusBadge(agency.subscription_status)}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {agency.plan_type && getPlanBadge(agency.plan_type)}
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Calendar className="h-3 w-3" />
                                            <span>{new Date(agency.created_at).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-6 text-center py-8">
                        <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Aucune agence récente</p>
                    </div>
                )}
            </div>
        </Card>
    );
};
