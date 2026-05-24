import React from 'react';
import { Building2, MapPin, Calendar } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Agency } from '../../../types/db';

interface AgenciesOverviewProps {
    agencies: Agency[];
    loading?: boolean;
    onViewDetails?: (agency: Agency) => void;
}

export const AgenciesOverview: React.FC<AgenciesOverviewProps> = ({ agencies, loading, onViewDetails }) => {
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

    const getPlanBadge = (planType: string) => {
        switch (planType) {
            case 'premium':
                return (
                    <span className="px-2 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 shadow-sm border border-indigo-200">
                        Premium
                    </span>
                );
            case 'enterprise':
                return (
                    <span className="px-2 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 shadow-sm border border-purple-200">
                        Enterprise
                    </span>
                );
            case 'free':
                return (
                    <span className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 shadow-sm border border-slate-200">
                        Gratuit
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200">
                        Fintech 1%
                    </span>
                );
        }
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
                                onClick={() => onViewDetails?.(agency)}
                                className={cn(
                                    "flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition-colors",
                                    onViewDetails ? "cursor-pointer hover:bg-slate-100 hover:border-slate-200" : ""
                                )}
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
                                <div className="flex items-center gap-4">
                                    {getPlanBadge(agency.plan_type)}
                                    <div className="text-right min-w-[100px]">
                                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
                                            <Calendar className="h-3 w-3" />
                                            <span>Inscrite le {new Date(agency.created_at).toLocaleDateString('fr-FR')}</span>
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
