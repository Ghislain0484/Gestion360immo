import React, { useState } from 'react';
import { User, Phone, Mail, MapPin, Building2, Wallet, Edit, ArrowLeft, FileText, Plus, Link, Trash2, X } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { useAuth } from '../../contexts/AuthContext';
import { dbService, supabase } from '../../lib/supabase';
import { Tenant, Property } from '../../types/db';
import { Contract } from '../../types/contracts';
import { extractIdFromSlug, generateSlug } from '../../utils/idSystem';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import { TenantForm } from './TenantForm';
import ReceiptGenerator from '../receipts/ReceiptGenerator';
import { PaymentsList } from '../payments/PaymentsList';
import { LinkTenantToPropertyModal } from './LinkTenantToPropertyModal';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

export const TenantDetails: React.FC = () => {
    const { id: slug } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { agencyId: authAgencyId, user } = useAuth();
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

    // Fetch Tenant's Contracts — direct fetch (no realtime sub to avoid channel collision)
    const [contracts, setContracts] = React.useState<Contract[]>([]);
    const [loadingContracts, setLoadingContracts] = React.useState(false);

    const fetchContracts = React.useCallback(async () => {
        if (!tenant?.id) return;
        setLoadingContracts(true);
        try {
            const result = await dbService.contracts.getAll({ tenant_id: tenant.id });
            setContracts(result || []);
        } catch (err) {
            console.error('Error fetching tenant contracts:', err);
        } finally {
            setLoadingContracts(false);
        }
    }, [tenant?.id]);

    React.useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    const activeContracts = (contracts || []).filter(c => c.status === 'active' || c.status === 'renewed');

    // Fetch Properties for all active contracts
    const [properties, setProperties] = useState<Property[]>([]);
    React.useEffect(() => {
        if (activeContracts.length > 0) {
            const propIds = activeContracts.map(c => c.property_id);
            Promise.all(propIds.map(id => dbService.properties.getById(id)))
                .then(props => setProperties(props.filter((p): p is Property => p !== null)));
        } else {
            setProperties([]);
        }
    }, [activeContracts.map(c => c.id).join(',')]);

    const [activeTab, setActiveTab] = useState('contract');
    const [showEditForm, setShowEditForm] = useState(false);
    const [showReceiptGenerator, setShowReceiptGenerator] = useState(false);
    const [showContractPicker, setShowContractPicker] = useState(false);
    const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Check if user can delete
    const canDelete = ['director', 'manager'].includes(user?.role || '');
    
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
                // Coverage calculation based on aggregate active contracts
                if (activeContracts.length > 0) {
                    const monthlyTotal = activeContracts.reduce((sum, c) => sum + (c.monthly_rent || 0) + (c.charges || 0), 0);
                    const monthsCovered = monthlyTotal > 0 ? totalPaidRent / monthlyTotal : 0;
                    
                    // Simplified aggregate status (using earliest start date)
                    const startDates = activeContracts.map(c => new Date(c.start_date).getTime());
                    const earliestStart = new Date(Math.min(...startDates));
                    const now = new Date();
                    const elapsedMonths = Math.max(0, (now.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
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
    }, [tenant?.id, activeContracts.length]);

    const handleDeleteTenant = async () => {
        if (!tenant || !user?.id || !authAgencyId) return;
        setIsDeleting(true);
        try {
            // 1. Audit Log
            await dbService.auditLogs.logDeletion({
                table_name: 'tenants',
                record_id: tenant.id,
                old_values: tenant,
                userId: user.id,
                agencyId: authAgencyId
            });

            // 2. Delete from Supabase
            const { error } = await supabase.from('tenants').delete().eq('id', tenant.id);
            if (error) throw error;

            toast.success('Locataire supprimé avec succès');
            navigate('/locataires');
        } catch (error: any) {
            console.error('Error deleting tenant:', error);
            toast.error('Erreur lors de la suppression : ' + error.message);
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

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
                        {activeContracts.length === 0 && (
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
                        {canDelete && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                onClick={() => setShowDeleteModal(true)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                            </Button>
                        )}
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
                                {activeContracts.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {activeContracts.map(contract => {
                                            const prop = properties.find(p => p.id === contract.property_id);
                                            return (
                                                <Card key={contract.id} className="p-5 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                            <Building2 className="w-5 h-5 text-primary-600" />
                                                            {prop?.title || 'Bien en cours...'}
                                                        </h3>
                                                        <Badge variant="success">Actif</Badge>
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        <div className="p-3 bg-gray-50 rounded-lg">
                                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Loyer Mensuel</p>
                                                            <p className="font-bold text-primary-700">
                                                                {contract.monthly_rent?.toLocaleString('fr-FR')} FCFA
                                                            </p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                                            <div>
                                                                <p className="text-gray-500 text-xs">Entrée</p>
                                                                <p className="font-medium">{new Date(contract.start_date).toLocaleDateString('fr-FR')}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500 text-xs">Type</p>
                                                                <p className="font-medium capitalize">{contract.type}</p>
                                                            </div>
                                                        </div>
                                                        <div className="pt-3 flex gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="flex-1 text-primary-600 hover:bg-primary-50"
                                                                onClick={() => {
                                                                    if (!prop) return;
                                                                    const slugId = prop.business_id || prop.id;
                                                                    const slug = generateSlug(slugId, prop.title);
                                                                    navigate(`/proprietes/${slug}`);
                                                                }}
                                                            >
                                                                Voir le bien
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="flex-1 text-gray-600 hover:bg-gray-100"
                                                                onClick={() => navigate(`/contrats`)} // Could be improved to deep link
                                                            >
                                                                Contrat
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                        
                                        {/* Add more properties option */}
                                        <div 
                                            onClick={() => setShowLinkModal(true)}
                                            className="p-5 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-primary-300 hover:text-primary-600 cursor-pointer transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2 group-hover:bg-primary-50">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                            <p className="font-medium">Lier un autre bien</p>
                                        </div>
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
                                            {activeContracts.length > 0 && (
                                                <Button
                                                    variant="primary"
                                                    onClick={() => {
                                                        if (activeContracts.length === 1) {
                                                            // Single contract: open directly
                                                            setSelectedContractId(activeContracts[0].id);
                                                            setShowReceiptGenerator(true);
                                                        } else {
                                                            // Multiple contracts: show picker first
                                                            setShowContractPicker(true);
                                                        }
                                                    }}
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

            {/* Contract Picker Modal - for multi-unit tenants */}
            {showContractPicker && activeContracts.length > 1 && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowContractPicker(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Choisir un bien</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Sélectionnez le bien pour lequel enregistrer le paiement</p>
                            </div>
                            <button onClick={() => setShowContractPicker(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {activeContracts.map(contract => {
                                const prop = properties.find(p => p.id === contract.property_id);
                                return (
                                    <button
                                        key={contract.id}
                                        className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                        onClick={() => {
                                            setSelectedContractId(contract.id);
                                            setShowContractPicker(false);
                                            setShowReceiptGenerator(true);
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900 group-hover:text-blue-700">
                                                    {prop?.title || 'Bien en chargement...'}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    Loyer : <span className="font-bold text-blue-600">{contract.monthly_rent?.toLocaleString('fr-FR')} FCFA</span>
                                                    {contract.charges ? ` + ${contract.charges.toLocaleString('fr-FR')} charges` : ''}
                                                </p>
                                            </div>
                                            <Building2 className="w-5 h-5 text-gray-300 group-hover:text-blue-400" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Generator Modal */}
            {showReceiptGenerator && selectedContractId && (() => {
                const contract = activeContracts.find(c => c.id === selectedContractId);
                if (!contract) return null;
                return (
                    <ReceiptGenerator
                        isOpen={showReceiptGenerator}
                        onClose={() => { setShowReceiptGenerator(false); setSelectedContractId(null); }}
                        contractId={contract.id}
                        tenantId={tenant.id}
                        propertyId={contract.property_id}
                        ownerId={contract.owner_id}
                        onReceiptGenerated={async () => {
                            setShowReceiptGenerator(false);
                            setSelectedContractId(null);
                        }}
                    />
                );
            })()}

            <ConfirmDeleteModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteTenant}
                itemTitle={`${tenant.first_name} ${tenant.last_name}`}
                isLoading={isDeleting}
                message="Voulez-vous vraiment supprimer ce locataire ? Ses contrats et paiements resteront en base mais ne seront plus liés."
            />
        </div>
    );
};
