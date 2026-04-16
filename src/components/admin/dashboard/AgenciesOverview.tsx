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

    const getPlanBadge = (agency: Agency) => {
        const subRaw = (agency as any)?.subscription;
        const sub = Array.isArray(subRaw) ? subRaw[0] : subRaw;
        const actualPlan = sub?.plan_type || agency.plan_type || 'basic';

        const colors: Record<string, string> = {
            basic: 'bg-gray-100 text-gray-700',
            premium: 'bg-blue-100 text-blue-700',
            enterprise: 'bg-purple-100 text-purple-700',
        };
        return (
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${colors[actualPlan] || colors.basic}`}>
                {actualPlan.charAt(0).toUpperCase() + actualPlan.slice(1)}
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
                                <div className="flex items-center gap-3">
                                    {getPlanBadge(agency)}
                                    <div className="text-right min-w-[100px]">
                                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mb-0.5">
                                            <Calendar className="h-3 w-3" />
                                            <span>Crée le {new Date(agency.created_at).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                        {(() => {
                                            const subRaw = (agency as any)?.subscription;
                                            const sub = Array.isArray(subRaw) ? subRaw[0] : subRaw;
                                            
                                            let expDate: Date | null = null;
                                            let label = "Expire";
                                            
                                            if (agency.subscription_status === 'trial') {
                                                expDate = new Date(new Date(agency.created_at).getTime() + 60 * 24 * 60 * 60 * 1000);
                                                label = "Fin essai";
                                            } else if (sub?.next_payment_date) {
                                                expDate = new Date(sub.next_payment_date);
                                            }

                                            if (!expDate) return null;

                                            const isExpired = expDate.getTime() < Date.now();

                                            return (
                                                <div className={cn(
                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-sm inline-block",
                                                    isExpired ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                                                )}>
                                                    {label} : {expDate.toLocaleDateString('fr-FR')}
                                                </div>
                                            );
                                        })()}
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
