import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, CheckCircle2, AlertCircle, XCircle, Plus, Edit, Trash2, Download } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { FilterBar } from '../shared/FilterBar';
import { TenantForm } from './TenantForm';
import { LinkTenantToPropertyModal } from './LinkTenantToPropertyModal';
import ReceiptGenerator from '../receipts/ReceiptGenerator';
import { FinancialStatements } from '../financial/FinancialStatements';
import { Tenant, TenantFormData, TenantWithRental } from '../../types/db';
import { useRealtimeData, useSupabaseCreate, useSupabaseDelete, useSupabaseUpdate } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { OHADAContractGenerator } from '../../utils/contractTemplates';
import { generateSlug } from '../../utils/idSystem';
import { useAuth } from '../../contexts/AuthContext';
import { SuccessModal } from '../ui/SuccessModal';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';
import { ViewToggle } from '../shared/ViewToggle';
import { TenantCard } from './TenantCard';
import { exportToExcel, formatTenantsForExport } from '../../utils/exportUtils';

const PAGE_SIZE = 100;

const paymentConfig = {
  bon: { label: 'Bon payeur', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  irregulier: { label: 'Irrégulier', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
  mauvais: { label: 'Mauvais payeur', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
};

const avatarColors = [
  'from-blue-500 to-indigo-600', 'from-purple-500 to-pink-600',
  'from-teal-500 to-cyan-600', 'from-orange-500 to-amber-600',
  'from-green-500 to-emerald-600', 'from-rose-500 to-red-600',
];
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

export const TenantsList: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showReceiptGenerator, setShowReceiptGenerator] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithRental | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tenantToLink, setTenantToLink] = useState<TenantWithRental | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ maritalStatus: 'all', paymentStatus: 'all' });
  const [filterOccupancy, setFilterOccupancy] = useState<'all' | 'active' | 'free'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(0);
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  const queryPropertyId = searchParams.get('propertyId');

  const handleFilterChange = (id: string, value: any) => setFilters(prev => ({ ...prev, [id]: value }));
  const clearFilters = () => { setFilters({ maritalStatus: 'all', paymentStatus: 'all' }); setSearchTerm(''); };

  useEffect(() => {
    if (action === 'new') {
      setIsEditing(false);
      setSelectedTenant(null);
      setShowForm(true);
    }
  }, [action]);

  const fetchTenants = useCallback(
    () => dbService.tenants.getAll({
      agency_id: user?.agency_id ?? undefined,
      limit: PAGE_SIZE,
      offset: currentPage * PAGE_SIZE,
      search: searchTerm,
      marital_status: filters.maritalStatus === 'all' ? undefined : filters.maritalStatus as Tenant['marital_status'],
      payment_status: filters.paymentStatus === 'all' ? undefined : filters.paymentStatus as Tenant['payment_status']
    }),
    [user?.agency_id, currentPage, searchTerm, filters]
  );

  const { data: tenants, initialLoading, error, setData, refetch } = useRealtimeData<Tenant>(fetchTenants, 'tenants');

  const stats = useMemo(() => {
    if (!tenants) return { total: 0, active: 0, free: 0 };
    const all = tenants.filter(t => {
      const tenant = t as TenantWithRental;
      const s = searchTerm.toLowerCase();
      return !s || (tenant.first_name || "").toLowerCase().includes(s) || (tenant.last_name || "").toLowerCase().includes(s) || (tenant.phone || "").includes(s);
    });
    const active = all.filter(t => (t as TenantWithRental).active_contracts && (t as TenantWithRental).active_contracts!.length > 0).length;
    return { total: all.length, active, free: all.length - active };
  }, [tenants, searchTerm]);

  const { deleteItem: deleteTenant } = useSupabaseDelete(dbService.tenants.delete, {
    onSuccess: () => { refetch(); toast.success('Locataire supprimé'); },
    onError: (err) => toast.error(err)
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  const { update: updateTenant } = useSupabaseUpdate(dbService.tenants.update, {
    onSuccess: (updated) => {
      setData(prev => prev.map(t => t.id === updated.id ? updated : t));
      refetch();
      setShowForm(false);
      setSuccessMessage({ title: 'Mise à jour réussie !', message: `Infos de ${updated.first_name} enregistrées.` });
      setShowSuccessModal(true);
    }
  });

  const { create: createTenant, loading: creatingTenant } = useSupabaseCreate(dbService.tenants.create, { 
    onSuccess: () => refetch(), 
    onError: (err) => toast.error(err) 
  });

  const handleAddTenant = useCallback(async (tenantData: TenantFormData, rentalParams?: any, property?: any) => {
    if (!user?.agency_id) return;
    try {
      const newTenant = await createTenant({ ...tenantData, agency_id: user.agency_id });
      if (newTenant && rentalParams && property) {
        const agency = await dbService.agencies.getById(user.agency_id);
        if (!agency) return;
        const contractPayload = {
          ...OHADAContractGenerator.generateRentalContractForTenant(newTenant, agency, property, {
            monthlyRent: rentalParams.monthlyRent, deposit: rentalParams.deposit,
            agencyFee: rentalParams.agencyFee, advance: rentalParams.monthlyRent * 2,
            duration: 12, startDate: new Date(rentalParams.startDate)
          }),
          status: 'active' as const
        };
        await dbService.contracts.create(contractPayload);
        await dbService.properties.update(property.id, { is_available: false });
        refetch();
        setSuccessMessage({ title: 'Création réussie', message: 'Locataire ajouté et contrat généré.' });
      } else {
        setSuccessMessage({ title: 'Locataire créé', message: 'Le locataire a été ajouté.' });
      }
      setShowForm(false);
      setShowSuccessModal(true);
    } catch (err) { toast.error('Erreur de création'); }
  }, [user?.agency_id, createTenant, refetch]);

  const handleFormSubmit = useCallback(async (tenantData: TenantFormData, rentalParams?: any, property?: any) => {
    if (isEditing && selectedTenant) await updateTenant(selectedTenant.id, tenantData);
    else await handleAddTenant(tenantData, rentalParams, property);
  }, [isEditing, selectedTenant, updateTenant, handleAddTenant]);

  const handleEditClick = (tenant: TenantWithRental) => { setSelectedTenant(tenant); setIsEditing(true); setShowForm(true); };
  const handleCreateClick = () => { setSelectedTenant(null); setIsEditing(false); setShowForm(true); };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce locataire ?')) return;
    await deleteTenant(id);
  };

  const handleExport = () => {
    const data = formatTenantsForExport(filteredTenants);
    exportToExcel(data, 'Locataires_Gestion360', 'Locataires');
    toast.success('Export réussi');
  };

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => {
      const tenant = t as TenantWithRental;
      const s = searchTerm.toLowerCase();
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const ns = normalize(searchTerm);
      const isOccupying = tenant.active_contracts && tenant.active_contracts.length > 0;
      const matchesSearch = !s ||
        (tenant.first_name || "").toLowerCase().includes(s) ||
        (tenant.last_name || "").toLowerCase().includes(s) ||
        (tenant.phone || "").includes(s) ||
        (tenant.profession || "").toLowerCase().includes(s) ||
        normalize(isOccupying ? 'occupant' : 'libre').includes(ns);

      const matchesMarital = filters.maritalStatus === 'all' || tenant.marital_status === filters.maritalStatus;
      const matchesPayment = filters.paymentStatus === 'all' || tenant.payment_status === filters.paymentStatus;
      const matchesOccupancy = filterOccupancy === 'all' || (filterOccupancy === 'active' && isOccupying) || (filterOccupancy === 'free' && !isOccupying);

      return matchesSearch && matchesMarital && matchesPayment && matchesOccupancy;
    });
  }, [tenants, searchTerm, filters, filterOccupancy]);

  const totalPages = Math.ceil((tenants?.length || 0) / PAGE_SIZE);

  if (authLoading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" /></div>;
  if (error) return <div className="text-center py-12"><p className="text-red-600 mb-4">{error}</p><Button onClick={refetch}>Réessayer</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locataires</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filteredTenants.length} locataires trouvés</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle view={viewMode} onChange={setViewMode} />
          <Button variant="outline" onClick={handleExport} className="flex items-center space-x-2 border-gray-300 text-gray-700">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
          <Button onClick={handleCreateClick} className="shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            <span>Nouveau Locataire</span>
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <FilterBar
          fields={[
            { id: 'paymentStatus', label: 'Statut Paiement', type: 'select', options: [{ value: 'bon', label: 'Bon payeur' }, { value: 'irregulier', label: 'Irrégulier' }, { value: 'mauvais', label: 'Mauvais payeur' }] },
            { id: 'maritalStatus', label: 'Statut Matrimonial', type: 'select', options: [{ value: 'celibataire', label: 'Célibataire' }, { value: 'marie', label: 'Marié(e)' }, { value: 'divorce', label: 'Divorcé(e)' }, { value: 'veuf', label: 'Veuf/Veuve' }] }
          ]}
          values={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Rechercher..."
          stats={[
            { label: 'Tous', count: stats.total, active: filterOccupancy === 'all', onClick: () => setFilterOccupancy('all') },
            { label: 'Actifs', count: stats.active, active: filterOccupancy === 'active', onClick: () => setFilterOccupancy('active'), activeColorClass: 'text-emerald-600', colorClass: 'bg-emerald-100' },
            { label: 'Libres', count: stats.free, active: filterOccupancy === 'free', onClick: () => setFilterOccupancy('free'), activeColorClass: 'text-amber-600', colorClass: 'bg-amber-100' }
          ]}
        />
      </Card>

      <div className="mt-2">
        {initialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 animate-pulse">
                <div className="h-12 w-12 bg-gray-100 rounded-xl" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 italic text-gray-400">Aucun locataire trouvé</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onNavigate={() => navigate(`/locataires/${generateSlug(tenant.business_id || tenant.id, `${tenant.first_name} ${tenant.last_name}`)}`)}
                onEdit={() => handleEditClick(tenant)}
                onLink={() => setTenantToLink(tenant)}
                onFinancials={() => { setSelectedTenant(tenant); setShowFinancialStatements(true); }}
                onReceipt={() => { setSelectedTenant(tenant); setShowReceiptGenerator(true); }}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTenants.map(tenant => {
                  const pCfg = paymentConfig[tenant.payment_status] ?? paymentConfig.bon;
                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/locataires/${generateSlug(tenant.business_id || tenant.id, `${tenant.first_name} ${tenant.last_name}`)}`)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br", getAvatarColor(tenant.first_name))}>
                            {tenant.first_name[0]}{tenant.last_name[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{tenant.first_name} {tenant.last_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", pCfg.bg, pCfg.color)}>{pCfg.label}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleEditClick(tenant)} className="text-indigo-600 hover:text-indigo-900"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteTenant(tenant.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <Button variant="outline" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>Précédent</Button>
          <span className="text-sm text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">{currentPage + 1} / {totalPages}</span>
          <Button variant="outline" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>Suivant</Button>
        </div>
      )}

      <TenantForm isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit} initialData={isEditing && selectedTenant ? selectedTenant : undefined} preSelectedPropertyId={queryPropertyId || undefined} isLoading={creatingTenant} />
      {selectedTenant && (
        <>
          <ReceiptGenerator isOpen={showReceiptGenerator} onClose={() => { setShowReceiptGenerator(false); setSelectedTenant(null); }} tenantId={selectedTenant.id} contractId={selectedTenant.active_contracts?.[0]?.id} propertyId={selectedTenant.active_contracts?.[0]?.property_id} ownerId={selectedTenant.active_contracts?.[0]?.owner_id} />
          <Modal isOpen={showFinancialStatements} onClose={() => { setShowFinancialStatements(false); setSelectedTenant(null); }} title="État financier" size="xl">
            <FinancialStatements entityId={selectedTenant.id} entityType="tenant" entityName={`${selectedTenant.first_name} ${selectedTenant.last_name}`} />
          </Modal>
        </>
      )}
      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title={successMessage.title} message={successMessage.message} />
      {tenantToLink && <LinkTenantToPropertyModal isOpen={!!tenantToLink} onClose={() => setTenantToLink(null)} tenant={tenantToLink} onLinked={() => { setTenantToLink(null); refetch(); }} />}
    </div>
  );
};
