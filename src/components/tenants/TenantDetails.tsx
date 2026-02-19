import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, Building2, Wallet, Edit, ArrowLeft, FileText, Plus } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { Tenant, Contract, Property } from '../../types/db';
import { extractIdFromSlug } from '../../utils/idSystem';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { TenantForm } from './TenantForm';
import ReceiptGenerator from '../receipts/ReceiptGenerator';
import { PaymentsList } from '../payments/PaymentsList';

export const TenantDetails: React.FC = () => {
    const { id: slug } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const tenantId = extractIdFromSlug(slug || '');

    // Fetch Tenant Data
    const fetchTenant = React.useCallback(async () => {
        const data = await dbService.tenants.getBySlugId(tenantId);
        return data ? [data] : [];
    }, [tenantId]);

    const { data: tenants, initialLoading: loadingTenant } = useRealtimeData<Tenant>(
        fetchTenant,
        'tenants',
        { id: tenantId }
    );
    const tenant = tenants?.[0];

    // Fetch Tenant's Contracts
    const fetchContracts = React.useCallback(async () => {
        if (!tenant?.id) return [];
        return dbService.contracts.getAll({ tenant_id: tenant.id });
    }, [tenant?.id]);

    const { data: contracts } = useRealtimeData<Contract>(
        fetchContracts,
        'contracts',
        { tenant_id: tenant?.id }
    );

    const activeContract = contracts?.find(c => c.status === 'active');

    // Fetch Property if active contract exists
    const [property, setProperty] = useState<Property | null>(null);
    React.useEffect(() => {
        if (activeContract?.property_id) {
            dbService.properties.getById(activeContract.property_id).then(setProperty);
        }
    }, [activeContract?.property_id]);

    const [activeTab, setActiveTab] = useState('contract');
    const [showEditForm, setShowEditForm] = useState(false);
    const [showReceiptGenerator, setShowReceiptGenerator] = useState(false);

    if (loadingTenant) {
        return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
    }

    if (!tenant) {
        return <div className="p-8 text-center text-red-500">Locataire introuvable (ID: {tenantId})</div>;
    }

    const tabs = [
        { id: 'contract', label: 'Bail Actuel', icon: FileText },
        { id: 'financials', label: 'Caisse & Paiements', icon: Wallet },
        { id: 'info', label: 'Informations', icon: User },
    ];

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Back Button */}
            <Button variant="ghost" size="sm" onClick={() => navigate('/locataires')} className="mb-2 pl-0 hover:bg-transparent hover:text-blue-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la liste
            </Button>

            {/* Header Card */}
            <Card className="p-6 border-l-4 border-l-blue-600">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                            {tenant.first_name[0]}{tenant.last_name[0]}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{tenant.first_name} {tenant.last_name}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {tenant.phone}</span>
                                {tenant.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {tenant.email}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
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
                        {activeTab === 'contract' && (
                            <div className="space-y-6">
                                {activeContract ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Card className="p-5 bg-white shadow-sm border border-gray-100">
                                            <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                                                <Building2 className="w-5 h-5 text-primary-600" />
                                                Informations sur la location
                                            </h3>
                                            <div className="space-y-4">
                                                {property ? (
                                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Bien Occupé</p>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-medium text-gray-900">{property.title}</p>
                                                                <p className="text-sm text-gray-600">{property.location.commune}, {property.location.quartier}</p>
                                                            </div>
                                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/proprietes/${property.id}`)} className="text-primary-600 hover:text-primary-700 hover:bg-primary-50">
                                                                Voir
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
                                                )}

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1 flex items-center gap-1">
                                                            <Wallet className="w-3 h-3" /> Loyer Mensuel
                                                        </p>
                                                        <p className="font-bold text-lg text-primary-700">
                                                            {activeContract.monthly_rent?.toLocaleString('fr-FR')} FCFA
                                                        </p>
                                                    </div>
                                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1 flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> Date d'entrée
                                                        </p>
                                                        <p className="font-medium text-gray-900">
                                                            {new Date(activeContract.start_date).toLocaleDateString('fr-FR')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Owner Information */}
                                                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                                    <p className="text-xs text-blue-600 uppercase font-semibold mb-2 flex items-center gap-1">
                                                        <User className="w-3 h-3" /> Propriétaire
                                                    </p>
                                                    {activeContract.owner ? (
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-medium text-gray-900">
                                                                    {/* Type assertion needed if owner isn't fully expanded, but usually it is from getAll */}
                                                                    {(activeContract.owner as any).first_name} {(activeContract.owner as any).last_name}
                                                                </p>
                                                                <p className="text-xs text-gray-500">{(activeContract.owner as any).business_id}</p>
                                                            </div>
                                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/proprietaires/${(activeContract.owner as any).id}`)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                                Contact
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500 italic">Information non disponible</p>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>

                                        <Card className="p-5 bg-white shadow-sm border border-gray-100">
                                            <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-gray-400" />
                                                Détails du contrat
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-gray-600 text-sm">Référence</span>
                                                    <span className="font-medium text-gray-900">{activeContract.contract_number || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-gray-600 text-sm">Durée</span>
                                                    <span className="font-medium text-gray-900">{activeContract.duration_months} mois</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-gray-600 text-sm">Prochaine échéance</span>
                                                    <span className="font-medium text-gray-900">
                                                        {/* Simple calculation for next due date based on logic or static display */}
                                                        {new Date().getDate() <= 5 ? "5 du mois courant" : "5 du mois prochain"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-gray-600 text-sm">Statut</span>
                                                    <Badge variant="success">Actif</Badge>
                                                </div>
                                                <div className="pt-4">
                                                    <Button variant="outline" className="w-full text-gray-600" onClick={() => navigate(`/contrats`)}>
                                                        <FileText className="w-4 h-4 mr-2" />
                                                        Voir le contrat complet
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">Aucun contrat actif</h3>
                                        <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                                            Ce locataire n'a pas de contrat de bail actif pour le moment.
                                        </p>
                                        <Button className="mt-4" onClick={() => navigate('/contrats')}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Créer un contrat
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <div className="space-y-6">
                                <Card>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">Paiements de loyer</h3>
                                                <p className="text-sm text-gray-600 mt-1">Historique des paiements de ce locataire</p>
                                            </div>
                                            {activeContract && (
                                                <Button
                                                    variant="primary"
                                                    onClick={() => setShowReceiptGenerator(true)}
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Enregistrer un paiement
                                                </Button>
                                            )}
                                        </div>

                                        {activeContract ? (
                                            <PaymentsList tenantId={tenant.id} limit={10} showActions={true} />
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>Aucun contrat actif. Créez un contrat pour enregistrer des paiements.</p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="max-w-2xl">
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Adresse de résidence</dt>
                                        <dd className="mt-1 text-sm text-gray-900 flex items-start gap-2">
                                            <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                                            {tenant.address}
                                        </dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Profession</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{tenant.profession || 'Non précisée'}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Nationalité</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{tenant.nationality || 'Non précisée'}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">ID Business</dt>
                                        <dd className="mt-1 text-sm text-gray-900 font-mono">{tenant.business_id}</dd>
                                    </div>
                                </dl>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TenantForm
                isOpen={showEditForm}
                onClose={() => setShowEditForm(false)}
                initialData={tenant}
                onSubmit={async (data) => {
                    await dbService.tenants.update(tenant.id, data);
                    setShowEditForm(false);
                }}
            />

            {/* Receipt Generator Modal */}
            {showReceiptGenerator && activeContract && (
                <ReceiptGenerator
                    isOpen={showReceiptGenerator}
                    onClose={() => setShowReceiptGenerator(false)}
                    contractId={activeContract.id}
                    tenantId={tenant.id}
                    propertyId={activeContract.property_id}
                    ownerId={activeContract.owner_id}
                    onReceiptGenerated={async () => {
                        setShowReceiptGenerator(false);
                    }}
                />
            )}
        </div>
    );
};
