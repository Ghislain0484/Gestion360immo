import React, { useState, useMemo } from 'react';
import { Search, Building2, MapPin, Mail, Calendar, Eye, Power, PowerOff } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Agency } from '../../../types/db';
import { useAgencies, useToggleAgencyStatus } from '../../../hooks/useAdminQueries';

interface AgenciesListProps {
    onViewDetails?: (agency: Agency) => void;
}

export const AgenciesList: React.FC<AgenciesListProps> = React.memo(({ onViewDetails }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');

    // Utilisation de React Query pour le cache et la synchronisation
    const { data: agencies = [], isLoading: loading, error } = useAgencies();
    const toggleStatus = useToggleAgencyStatus();

    const filteredAgencies = useMemo(() => {
        return agencies.filter((agency) => {
            const matchesSearch =
                agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                agency.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                agency.email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                statusFilter === 'all' || agency.subscription_status === statusFilter;

            const matchesPlan =
                planFilter === 'all' || agency.plan_type === planFilter;

            return matchesSearch && matchesStatus && matchesPlan;
        });
    }, [agencies, searchTerm, statusFilter, planFilter]);

    const getStatusBadge = useMemo(() => (status: string | null | undefined) => {
        // Valeur par défaut si null ou undefined
        const actualStatus = status || 'active';

        const variants: Record<string, any> = {
            active: { variant: 'success', label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
            suspended: { variant: 'warning', label: 'Suspendue', color: 'bg-orange-100 text-orange-700' },
            trial: { variant: 'secondary', label: 'Essai', color: 'bg-blue-100 text-blue-700' },
            cancelled: { variant: 'danger', label: 'Annulée', color: 'bg-red-100 text-red-700' },
        };

        const config = variants[actualStatus] || variants.active;

        return (
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    }, []);

    const getPlanBadge = useMemo(() => (plan: string | null | undefined) => {
        // Valeur par défaut si null ou undefined
        const actualPlan = plan || 'premium';

        const colors: Record<string, string> = {
            basic: 'bg-gray-100 text-gray-700 border border-gray-300',
            premium: 'bg-blue-100 text-blue-700 border border-blue-300',
            enterprise: 'bg-purple-100 text-purple-700 border border-purple-300',
        };

        const planColor = colors[actualPlan] || colors.premium;

        return (
            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${planColor}`}>
                {actualPlan.charAt(0).toUpperCase() + actualPlan.slice(1)}
            </span>
        );
    }, []);

    const handleToggleStatus = async (agency: Agency) => {
        toggleStatus.mutate({
            id: agency.id,
            currentStatus: agency.subscription_status,
        });
    };

    if (error) {
        return (
            <Card className="border-none bg-white shadow-lg">
                <div className="p-12 text-center">
                    <p className="text-red-600">Erreur lors du chargement des agences</p>
                    <Button onClick={() => window.location.reload()} className="mt-4">
                        Réessayer
                    </Button>
                </div>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card className="border-none bg-white shadow-lg">
                <div className="p-6 space-y-4 animate-pulse">
                    <div className="h-10 bg-gray-200 rounded" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filtres et recherche */}
            <Card className="border-none bg-white shadow-lg">
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Recherche */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher une agence..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    aria-label="Rechercher une agence"
                                />
                            </div>
                        </div>

                        {/* Filtres */}
                        <div className="flex gap-3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                                aria-label="Filtrer par statut"
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspendue</option>
                                <option value="trial">Essai</option>
                                <option value="cancelled">Annulée</option>
                            </select>

                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                                aria-label="Filtrer par plan"
                            >
                                <option value="all">Tous les plans</option>
                                <option value="basic">Basic</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>

                    {/* Résultats */}
                    <div className="mt-4 flex items-center gap-2">
                        <Badge variant="primary" className="bg-gradient-to-r from-blue-600 to-emerald-600">
                            {filteredAgencies.length} agence{filteredAgencies.length > 1 ? 's' : ''}
                        </Badge>
                        <span className="text-sm text-gray-600">trouvée{filteredAgencies.length > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </Card>

            {/* Liste des agences */}
            <div className="space-y-4" role="list" aria-label="Liste des agences">
                {filteredAgencies.length > 0 ? (
                    filteredAgencies.map((agency, index) => (
                        <AgencyCard
                            key={agency.id}
                            agency={agency}
                            index={index}
                            onViewDetails={onViewDetails}
                            onToggleStatus={handleToggleStatus}
                            isProcessing={toggleStatus.isPending}
                            getStatusBadge={getStatusBadge}
                            getPlanBadge={getPlanBadge}
                        />
                    ))
                ) : (
                    <Card className="border-none bg-white shadow-md">
                        <div className="p-12 text-center">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mx-auto mb-4">
                                <Building2 className="h-12 w-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune agence trouvée</h3>
                            <p className="text-gray-500">Essayez de modifier vos filtres de recherche</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
});

AgenciesList.displayName = 'AgenciesList';

// Composant AgencyCard mémorisé pour éviter les re-renders inutiles
const AgencyCard = React.memo<{
    agency: Agency;
    index: number;
    onViewDetails?: (agency: Agency) => void;
    onToggleStatus: (agency: Agency) => void;
    isProcessing: boolean;
    getStatusBadge: (status: string | null | undefined) => JSX.Element;
    getPlanBadge: (plan: string | null | undefined) => JSX.Element | null;
}>(({ agency, index, onViewDetails, onToggleStatus, isProcessing, getStatusBadge, getPlanBadge }) => {
    return (
        <Card
            className="border-none bg-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group"
            style={{ animationDelay: `${index * 50}ms` }}
            role="listitem"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-emerald-100 shadow-lg group-hover:scale-110 transition-transform">
                            <Building2 className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-xl font-bold text-slate-900">{agency.name}</p>
                                {getStatusBadge(agency.subscription_status)}
                                {getPlanBadge(agency.plan_type)}
                            </div>
                            <div className="flex items-center gap-6 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">{agency.city}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-blue-500" />
                                    <span>{agency.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    <span>{new Date(agency.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewDetails?.(agency)}
                            className="hover:bg-blue-50 hover:text-blue-600"
                            aria-label={`Modifier l'agence ${agency.name}`}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Modifier
                        </Button>
                        <Button
                            size="sm"
                            variant={(agency.subscription_status || 'suspended') === 'active' ? 'danger' : 'success'}
                            onClick={() => onToggleStatus(agency)}
                            disabled={isProcessing}
                            isLoading={isProcessing}
                            className="shadow-md hover:shadow-lg transition-shadow min-w-[120px]"
                            aria-label={`${(agency.subscription_status || 'suspended') === 'active' ? 'Suspendre' : 'Activer'} l'agence ${agency.name}`}
                        >
                            {!isProcessing && (
                                <>
                                    {(agency.subscription_status || 'suspended') === 'active' ? (
                                        <>
                                            <PowerOff className="h-4 w-4 mr-2" />
                                            Suspendre
                                        </>
                                    ) : (
                                        <>
                                            <Power className="h-4 w-4 mr-2" />
                                            Activer
                                        </>
                                    )}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Card>
    );
});

AgencyCard.displayName = 'AgencyCard';
