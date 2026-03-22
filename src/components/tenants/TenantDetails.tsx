import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, Building2, Wallet, Edit, ArrowLeft, FileText, Plus, Link } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { Tenant, Property } from '../../types/db';
import { Contract } from '../../types/contracts';
import { extractIdFromSlug } from '../../utils/idSystem';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { TenantForm } from './TenantForm';
import ReceiptGenerator from '../receipts/ReceiptGenerator';
import { PaymentsList } from '../payments/PaymentsList';
import { LinkTenantToPropertyModal } from './LinkTenantToPropertyModal';

export const TenantDetails: React.FC = () => {
    const { id: slug } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { agencyId: authAgencyId } = useAuth();
    const tenantId = extractIdFromSlug(slug || '');

    // Fetch Tenant Data
    const fetchTenant = React.useCallback(async () => {
        if (!authAgencyId) return [];
        const data = await dbService.tenants.getBySlugId(tenantId, authAgencyId);
        return data ? [data] : [];
    }, [tenantId, authAgencyId]);

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
    const [showLinkModal, setShowLinkModal] = useState(false);
    
    // Expert Financial Data
    const [receipts, setReceipts] = useState<any[]>([]);
    const [financialData, setFinancialData] = useState<any>(null);

    React.useEffect(() => {
        if (!tenant?.id) return;
        const loadFinance = async () => {
            // Fetch all receipts for this tenant (not just active contract)
            const receipts = await dbService.rentReceipts.getAll({ tenant_id: tenant.id });
            const { data: receiptsData } = { data: receipts };
            
            if (receiptsData) {
                const sorted = receiptsData.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
                setReceipts(sorted);
                
                // Calcul pro: On ne compte que la part LOYER + CHARGES pour la couverture
                const totalPaidRent = receiptsData.reduce((sum: any, r: any) => sum + (r.rent_amount || 0) + (r.charges || 0), 0);
                const totalCaution = receiptsData.reduce((sum: any, r: any) => sum + (r.deposit_amount || 0), 0);
                
                // Coverage calculation based on active contract if available
                if (activeContract) {
                    const monthlyTotal = (activeContract.monthly_rent || 0) + (activeContract.charges || 0);
                    const monthsCovered = monthlyTotal > 0 ? totalPaidRent / monthlyTotal : 0;
                    
                    const start = new Date(activeContract.start_date);
                    const now = new Date();
                    const elapsedMonths = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
                    const balance = monthsCovered - elapsedMonths;
                    
                    const isVeryNew = elapsedMonths < 0.25;
                    const isLate = balance < -0.5 || (balance < -0.16 && !isVeryNew);
                    const status = balance >= 0.1 ? 'advance' : isLate ? 'late' : 'ok';
                    
                    setFinancialData({ totalPaid: totalPaidRent, totalCaution, monthsCovered, elapsedMonths, balance, status });
                } else {
                    setFinancialData({ totalPaid: totalPaidRent, totalCaution, monthsCovered: 0, elapsedMonths: 0, balance: 0, status: 'ok' });
                }
            }
        };
        loadFinance();
    }, [tenant?.id, activeContract?.id]);

    if (loadingTenant) {
        return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
    }

    if (!tenant) {
        return <div className="p-8 text-center text-red-500">
            <h3 className="text-lg font-bold">Accès refusé ou locataire introuvable</h3>
            <p>Vous n'avez pas les permissions pour consulter ce locataire ou il n'existe pas.</p>
            <Button onClick={() => navigate('/locataires')} className="mt-4" variant="outline">Retour à la liste</Button>
        </div>;
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
                        {/* Show "Lier à un bien" button if no active contract */}
                        {!activeContract && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                onClick={() => setShowLinkModal(true)}
                            >
                                <Link className="w-4 h-4 mr-2" />
                                Lier à un bien
                            </Button>
                        )}
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
                                                    <span className="font-medium text-gray-900">{activeContract.id.split('-')[0].toUpperCase()}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-gray-600 text-sm">Type</span>
                                                    <span className="font-medium text-gray-900 capitalize">{activeContract.type}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-gray-600 text-sm">Prochaine échéance</span>
                                                    <span className="font-medium text-gray-900">
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
                                {financialData && (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <Card className="p-4 bg-slate-50 border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Loyers Perçus</p>
                                            <p className="text-xl font-black text-slate-900">{financialData.totalPaid.toLocaleString('fr-FR')} FCFA</p>
                                        </Card>
                                        <Card className="p-4 bg-amber-50 border-amber-100">
                                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Caution Détenue</p>
                                            <p className="text-xl font-black text-amber-700">{financialData.totalCaution.toLocaleString('fr-FR')} FCFA</p>
                                        </Card>
                                        <Card className="p-4 bg-slate-50 border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Couverture</p>
                                            <p className="text-xl font-black text-emerald-600">{financialData.monthsCovered.toFixed(1)} mois</p>
                                        </Card>
                                        <Card className={`p-4 border-slate-100 ${
                                            financialData.status === 'late' ? 'bg-rose-50 text-rose-600' : 
                                            financialData.status === 'advance' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Statut Solvabilité</p>
                                            <p className="text-xl font-black">
                                                {financialData.status === 'late' ? 'En Retard' : 
                                                 financialData.status === 'advance' ? `Avance +${financialData.balance.toFixed(1)}m` : 'À Jour'}
                                            </p>
                                        </Card>
                                    </div>
                                )}
                                <Card>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">Paiements de loyer (Expert)</h3>
                                                <p className="text-sm text-gray-600 mt-1">Livre de caisse détaillé pour ce locataire</p>
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

                                        <PaymentsList tenantId={tenant.id} limit={20} showActions={true} />
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

            {/* Link tenant to a property (retroactive contract) */}
            {showLinkModal && (
                <LinkTenantToPropertyModal
                    isOpen={showLinkModal}
                    onClose={() => setShowLinkModal(false)}
                    tenant={tenant}
                    onLinked={() => {
                        setShowLinkModal(false);
                        // Realtime subscription will refresh contracts automatically
                    }}
                />
            )}

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
