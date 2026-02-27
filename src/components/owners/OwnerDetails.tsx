import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, Building2, Wallet, Edit, Plus, ArrowLeft, Users, Trash2 } from 'lucide-react';
import { useRealtimeData, useSupabaseCreate } from '../../hooks/useSupabaseData';
import { useAuth } from '../../contexts/AuthContext';
import { OHADAContractGenerator } from '../../utils/contractTemplates';
import toast from 'react-hot-toast';
import { dbService } from '../../lib/supabase';
import { Owner, Property } from '../../types/db';
import { extractIdFromSlug, generateSlug } from '../../utils/idSystem';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { PropertyCard } from '../properties/PropertyCard';
import { PropertyForm } from '../properties/PropertyForm';
import { OwnerForm } from './OwnerForm';
import OwnerReversalModal from './OwnerReversalModal';
import { PaymentsList } from '../payments/PaymentsList';
import { OwnerReversalCalculator, ReversalDetails } from './OwnerReversalCalculator';

export const OwnerDetails: React.FC = () => {
    const { id: slug } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, agencyId: authAgencyId } = useAuth();
    const ownerId = extractIdFromSlug(slug || '');

    // 1. Fetchers
    const fetchOwner = React.useCallback(async () => {
        if (!authAgencyId) return [];
        const data = await dbService.owners.getBySlugId(ownerId, authAgencyId);
        return data ? [data] : [];
    }, [ownerId, authAgencyId]);

    // 2. Realtime Data Hooks
    const { data: owners, initialLoading: loadingOwner } = useRealtimeData<Owner>(
        fetchOwner,
        'owners',
        { id: ownerId }
    );
    const owner = owners?.[0];

    const fetchProperties = React.useCallback(async () => {
        if (!owner?.id || !authAgencyId) return [];
        return dbService.properties.getAll({ owner_id: owner.id, agency_id: authAgencyId, limit: 100 });
    }, [owner?.id, authAgencyId]);

    const { data: ownerProperties = [] } = useRealtimeData<Property>(
        fetchProperties,
        'properties',
        { owner_id: owner?.id }
    );

    const { data: contracts = [] } = useRealtimeData(dbService.contracts.getAll, 'contracts', { agency_id: authAgencyId || undefined });
    const { data: tenants = [] } = useRealtimeData(dbService.tenants.getAll, 'tenants', { agency_id: authAgencyId || undefined });

    // 3. State Hooks
    const [activeTab, setActiveTab] = useState('properties');
    const [showPropertyForm, setShowPropertyForm] = useState(false);
    const [showEditOwnerForm, setShowEditOwnerForm] = useState(false);
    const [showOwnerReversal, setShowOwnerReversal] = useState(false);
    const [reversalAmount, setReversalAmount] = useState<number>(0);
    const [reversalDetails, setReversalDetails] = useState<ReversalDetails | null>(null);

    // 4. Mutation Hooks
    const { create: createProperty } = useSupabaseCreate(
        dbService.properties.create,
        {
            errorMessage: "Erreur lors de la création du bien"
        }
    );

    // 5. Effect Hooks
    useEffect(() => {
        if (showPropertyForm) {
            console.log(`🏠 OwnerDetails: showPropertyForm = ${showPropertyForm}`);
        }
    }, [showPropertyForm]);

    // 6. Memoized Data
    const ownerTenants = React.useMemo(() => {
        const tenantMap = new Map();
        contracts?.forEach(c => {
            const prop = ownerProperties?.find(p => p.id === c.property_id);
            if (prop && c.status === 'active' && c.type === 'location') {
                const tenant = tenants?.find(t => t.id === c.tenant_id);
                if (tenant) {
                    tenantMap.set(tenant.id, {
                        ...tenant,
                        propertyTitle: prop.title
                    });
                }
            }
        });
        return Array.from(tenantMap.values());
    }, [contracts, ownerProperties, tenants]);

    const tabs = [
        { id: 'properties', label: `Biens (${ownerProperties?.length || 0})`, icon: Building2 },
        { id: 'tenants', label: `Locataires (${ownerTenants.length})`, icon: Users },
        { id: 'financials', label: 'Caisse & Paiements', icon: Wallet },
        { id: 'info', label: 'Informations', icon: User },
    ];

    // 7. Early Returns
    if (loadingOwner) {
        return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
    }

    if (!owner) {
        return <div className="p-8 text-center text-red-500">
            <h3 className="text-lg font-bold">Accès refusé ou propriétaire introuvable</h3>
            <p>Vous n'avez pas les permissions pour consulter ce propriétaire ou il n'existe pas.</p>
            <Button onClick={() => navigate('/proprietaires')} className="mt-4" variant="outline">Retour à la liste</Button>
        </div>;
    }

    // 8. Render
    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Back Button */}
            <Button variant="ghost" size="sm" onClick={() => navigate('/proprietaires')} className="mb-2 pl-0 hover:bg-transparent hover:text-blue-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la liste
            </Button>

            {/* Header Card */}
            <Card className="p-6 border-l-4 border-l-primary-600">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
                            {owner.first_name[0]}{owner.last_name[0]}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{owner.first_name} {owner.last_name}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {owner.phone}</span>
                                {owner.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {owner.email}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowEditOwnerForm(true)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={async () => {
                                if (confirm(`Supprimer définitivement ${owner.first_name} ${owner.last_name} ? Cette action supprimera également tous ses biens et l'historique associé.`)) {
                                    const toastId = toast.loading('Suppression en cours...');
                                    try {
                                        await dbService.owners.safeDelete(owner.id, authAgencyId || undefined);
                                        toast.success('Propriétaire supprimé avec succès', { id: toastId });
                                        navigate('/proprietaires');
                                    } catch (err: any) {
                                        console.error(err);
                                        toast.error('Erreur lors de la suppression: ' + (err.message || ''), { id: toastId });
                                    }
                                }
                            }}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                        </Button>
                        <Button size="sm" onClick={() => setShowPropertyForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter un bien
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Tabs & Content */}
            <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 px-4">
                        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
                    </div>

                    <div className="p-6">
                        {activeTab === 'properties' && (
                            <div className="space-y-4">
                                {ownerProperties.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>Ce propriétaire n'a pas encore de biens.</p>
                                        <Button variant="outline" className="mt-4" onClick={() => setShowPropertyForm(true)}>
                                            Ajouter un premier bien
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {ownerProperties.map(property => (
                                            <PropertyCard
                                                key={property.id}
                                                property={property}
                                                onClick={() => {
                                                    const slug = generateSlug(property.id, property.title);
                                                    navigate(`/proprietes/${slug}`);
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'tenants' && (
                            <div className="space-y-4">
                                {ownerTenants.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>Aucun locataire actif pour ce propriétaire.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {ownerTenants.map(tenant => (
                                            <Card key={tenant.id} className="p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                        {tenant.first_name[0]}{tenant.last_name[0]}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-900">{tenant.first_name} {tenant.last_name}</h4>
                                                        <p className="text-sm text-gray-500">{tenant.propertyTitle}</p>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {tenant.phone}</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        const slug = generateSlug(tenant.id, `${tenant.first_name} ${tenant.last_name}`);
                                                        navigate(`/locataires/${slug}`);
                                                    }}>
                                                        Dossier
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <div className="space-y-6">
                                {/* Calculateur de reversement */}
                                <Card>
                                    <div className="p-6">
                                        <OwnerReversalCalculator
                                            ownerId={owner.id}
                                            ownerName={`${owner.first_name} ${owner.last_name}`}
                                            onGenerateReversal={(amount, details) => {
                                                setReversalAmount(amount);
                                                setReversalDetails(details);
                                                setShowOwnerReversal(true);
                                            }}
                                        />
                                    </div>
                                </Card>

                                {/* Liste des paiements */}
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Historique des paiements</h4>
                                    <PaymentsList ownerId={owner.id} limit={20} showActions={true} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="max-w-2xl">
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Adresse</dt>
                                        <dd className="mt-1 text-sm text-gray-900 flex items-start gap-2">
                                            <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                                            {owner.address}, {owner.city}
                                        </dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Situation Matrimoniale</dt>
                                        <dd className="mt-1 text-sm text-gray-900 capitalize">{owner.marital_status}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Titre de propriété</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            <Badge variant="secondary">{owner.property_title}</Badge>
                                        </dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Enfants</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{owner.children_count}</dd>
                                    </div>
                                </dl>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <PropertyForm
                isOpen={showPropertyForm}
                onClose={() => setShowPropertyForm(false)}
                initialData={{ owner_id: owner.id }}
                onSubmit={async (data) => {
                    const newProperty = await createProperty(data);
                    if (newProperty && user?.agency_id) {
                        try {
                            const agency = await dbService.agencies.getById(user.agency_id);
                            if (agency) {
                                const contractPayload = await OHADAContractGenerator.generateManagementContractForOwner(
                                    owner,
                                    agency,
                                    newProperty
                                );
                                await dbService.contracts.create(contractPayload);
                                toast.success("Contrat de gestion généré automatiquement");
                            }
                        } catch (error) {
                            console.error("Error generating management contract:", error);
                            toast.error("Erreur lors de la génération du contrat de gestion");
                        }
                    }
                }}
            />

            <OwnerForm
                isOpen={showEditOwnerForm}
                onClose={() => setShowEditOwnerForm(false)}
                initialData={owner}
                onSuccess={() => { }}
            />

            {showOwnerReversal && (
                <OwnerReversalModal
                    isOpen={showOwnerReversal}
                    onClose={() => {
                        setShowOwnerReversal(false);
                        setReversalAmount(0);
                        setReversalDetails(null);
                    }}
                    ownerId={owner.id}
                    ownerName={`${owner.first_name} ${owner.last_name}`}
                    initialAmount={reversalAmount}
                    details={reversalDetails}
                    onSuccess={async () => {
                        setShowOwnerReversal(false);
                        setReversalAmount(0);
                        setReversalDetails(null);
                    }}
                />
            )}
        </div>
    );
};
