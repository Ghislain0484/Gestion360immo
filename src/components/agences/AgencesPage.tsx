import React, { useState, useEffect } from 'react';
import { Plus, Search, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { clsx } from 'clsx';

interface Agency {
    id: string;
    business_id: string;
    nom: string;
    telephone: string;
    email?: string;
    adresse?: string;
    logo_url?: string;
    statut: 'actif' | 'suspendu';
    created_at: string;
    _count?: {
        properties: number;
        owners: number;
        tenants: number;
    };
}

export const AgencesPage: React.FC = () => {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAgencies();
    }, []);

    const fetchAgencies = async () => {
        setIsLoading(true);

        const { data } = await supabase
            .from('agencies')
            .select(`
        id,
        business_id,
        nom,
        telephone,
        email,
        adresse,
        logo_url,
        statut,
        created_at
      `)
            .order('nom');

        if (data) {
            // Fetch counts for each agency
            const agenciesWithCounts = await Promise.all(
                data.map(async (agency) => {
                    const [properties, owners, tenants] = await Promise.all([
                        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
                        supabase.from('owners').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
                        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
                    ]);

                    return {
                        ...agency,
                        _count: {
                            properties: properties.count || 0,
                            owners: owners.count || 0,
                            tenants: tenants.count || 0,
                        },
                    };
                })
            );

            setAgencies(agenciesWithCounts);
        }

        setIsLoading(false);
    };

    const filteredAgencies = agencies.filter((agency) =>
        agency.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.business_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.telephone.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Agences</h1>
                    <p className="text-gray-500 mt-1">Gestion des agences immobilières</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg">
                    <Plus className="w-4 h-4" />
                    <span>Nouvelle agence</span>
                </button>
            </div>

            {/* Search */}
            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher par nom, code, téléphone..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
            </Card>

            {/* Agencies Grid */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" label="Chargement des agences..." />
                </div>
            ) : filteredAgencies.length === 0 ? (
                <EmptyState
                    icon="🏛️"
                    title={searchQuery ? "Aucune agence trouvée" : "Aucune agence enregistrée"}
                    description={searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Commencez par ajouter votre première agence"}
                    action={!searchQuery ? {
                        label: "Ajouter une agence",
                        onClick: () => console.log('Add agency'),
                    } : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAgencies.map((agency) => (
                        <Card
                            key={agency.id}
                            className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                        >
                            <div className="flex items-start gap-4">
                                {/* Logo */}
                                <div className="flex-shrink-0">
                                    {agency.logo_url ? (
                                        <img
                                            src={agency.logo_url}
                                            alt={agency.nom}
                                            className="w-16 h-16 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-indigo-100 rounded-lg flex items-center justify-center">
                                            <Building className="w-8 h-8 text-primary-600" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                                            {agency.nom}
                                        </h3>
                                        <StatusBadge status={agency.statut} size="sm" />
                                    </div>

                                    <p className="text-xs text-gray-500 font-mono mb-3">{agency.business_id}</p>

                                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                                        <p className="flex items-center gap-2">
                                            <span className="text-gray-400">📞</span>
                                            <span>{agency.telephone}</span>
                                        </p>
                                        {agency.email && (
                                            <p className="flex items-center gap-2 truncate">
                                                <span className="text-gray-400">✉️</span>
                                                <span className="truncate">{agency.email}</span>
                                            </p>
                                        )}
                                        {agency.adresse && (
                                            <p className="flex items-center gap-2 truncate">
                                                <span className="text-gray-400">📍</span>
                                                <span className="truncate">{agency.adresse}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500">Biens</p>
                                            <p className="text-lg font-semibold text-gray-900">{agency._count?.properties || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500">Propriétaires</p>
                                            <p className="text-lg font-semibold text-gray-900">{agency._count?.owners || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500">Locataires</p>
                                            <p className="text-lg font-semibold text-gray-900">{agency._count?.tenants || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AgencesPage;
