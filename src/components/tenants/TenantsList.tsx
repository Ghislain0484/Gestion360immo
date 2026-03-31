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

// ─── Payment status helpers ──────────────────────────────────────────────────
const paymentConfig = {
  bon: { label: 'Bon payeur', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  irregulier: { label: 'Irrégulier', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
  mauvais: { label: 'Mauvais payeur', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
};

// ─── Avatar with initials ────────────────────────────────────────────────────
const avatarColors = [
  'from-blue-500 to-indigo-600', 'from-purple-500 to-pink-600',
  'from-teal-500 to-cyan-600', 'from-orange-500 to-amber-600',
  'from-green-500 to-emerald-600', 'from-rose-500 to-red-600',
];
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

// ─── Main TenantsList ────────────────────────────────────────────────────────
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
  const [filters, setFilters] = useState({
    maritalStatus: 'all',
    paymentStatus: 'all',
  });
  const [filterOccupancy, setFilterOccupancy] = useState<'all' | 'active' | 'free'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleFilterChange = (id: string, value: any) => {
    setFilters(prev => ({ ...prev, [id]: value }));
  };

  const clearFilters = () => {
    setFilters({ maritalStatus: 'all', paymentStatus: 'all' });
    setSearchTerm('');
  };
  const [currentPage, setCurrentPage] = useState(0);
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  const queryPropertyId = searchParams.get('propertyId');

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

  const { data: tenants, initialLoading, error, setData, refetch } = useRealtimeData<Tenant>(
    fetchTenants,
    'tenants'
  );

  // Calculate stats for filters
  const stats = useMemo(() => {
    if (!tenants) return { total: 0, active: 0, free: 0 };
    const filteredBySearch = tenants.filter(t => {
      const tenant = t as TenantWithRental;
      const s = searchTerm.toLowerCase();
      return !s ||
        (tenant.first_name || "").toLowerCase().includes(s) ||
        (tenant.last_name || "").toLowerCase().includes(s) ||
        (tenant.phone || "").includes(s);
    });

    const active = filteredBySearch.filter(t => (t as TenantWithRental).active_contracts?.length! > 0).length;
    return {
      total: filteredBySearch.length,
      active,
      free: filteredBySearch.length - active
    };
  }, [tenants, searchTerm]);

  const { deleteItem: deleteTenant } = useSupabaseDelete(
    dbService.tenants.delete,
    {
      onSuccess: () => { refetch(); toast.success('Locataire supprimé avec succès'); },
      onError: (err: any) => toast.error(err)
    }
  );

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  const { update: updateTenant } = useSupabaseUpdate(
    dbService.tenants.update,
    {
      onSuccess: (updatedTenant) => {
        setData(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
        refetch();
        setShowForm(false);
        setIsEditing(false);
        setSuccessMessage({
          title: 'Mise à jour réussie !',
          message: `Les informations de ${updatedTenant.first_name} ${updatedTenant.last_name} ont bien été enregistrées.`
        });
        setShowSuccessModal(true);
      },
      onError: (err) => { console.error('Update Error:', err); toast.error('Erreur lors de la mise à jour : ' + err); }
    }
  );

  const { create: createTenant, loading: creatingTenant } = useSupabaseCreate(
    dbService.tenants.create,
    { onSuccess: () => refetch(), onError: (err) => toast.error(err) }
  );

  const handleAddTenant = useCallback(async (tenantData: TenantFormData, rentalParams?: any, property?: any) => {
    if (!user?.agency_id) { toast.error('Aucune agence associée'); return; }
    try {
      const newTenant = await createTenant({ ...tenantData, agency_id: user.agency_id });
      if (newTenant && rentalParams && property) {
        toast.loading('Génération du contrat en cours...', { id: 'contract-gen' });
        const agency = await dbService.agencies.getById(user.agency_id);
        const owner = await dbService.owners.getById(property.owner_id);
        if (!agency || !owner) {
          toast.error('Erreur: Agence ou Propriétaire introuvable pour le contrat', { id: 'contract-gen' });
          return;
        }
        const contractPayload = {
          ...OHADAContractGenerator.generateRentalContractForTenant(newTenant, agency, property, {
            monthlyRent: rentalParams.monthlyRent,
            deposit: rentalParams.deposit,
            agencyFee: rentalParams.agencyFee,
            advance: rentalParams.monthlyRent * 2,
            duration: 12,
            startDate: new Date(rentalParams.startDate)
          }),
          status: 'active' as const
        };
        await dbService.contracts.create(contractPayload);
        await dbService.properties.update(property.id, { is_available: false });
        refetch();
        if (confirm('Voulez-vous imprimer le contrat de bail maintenant ?')) {
          await OHADAContractGenerator.printContract(contractPayload, agency, newTenant, property);
        }
        toast.dismiss('contract-gen');
      } else {
        setSuccessMessage({ title: 'Locataire créé !', message: 'Le locataire a été ajouté à la base de données.' });
      }
      setShowForm(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la création');
    }
  }, [user?.agency_id, createTenant, refetch]);

  const handleEditClick = useCallback((tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditing(true);
    setShowForm(true);
  }, []);

  const handleCreateClick = useCallback(() => {
    setSelectedTenant(null);
    setIsEditing(false);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(async (tenantData: TenantFormData, rentalParams?: any, property?: any) => {
    try {
      if (isEditing && selectedTenant) {
        await updateTenant(selectedTenant.id, tenantData);
        if (rentalParams && property) {
          toast.loading('Génération du nouveau contrat...', { id: 'contract-update' });
          const agency = await dbService.agencies.getById(user?.agency_id!);
          const owner = await dbService.owners.getById(property.owner_id);
          if (!agency || !owner) { toast.error('Erreur: Introuvables pour le contrat', { id: 'contract-update' }); return; }
          const tenantForContract: Tenant = { ...selectedTenant, ...tenantData };
          const contractPayload = {
            ...OHADAContractGenerator.generateRentalContractForTenant(tenantForContract, agency, property, {
              monthlyRent: rentalParams.monthlyRent, deposit: rentalParams.deposit,
              agencyFee: rentalParams.agencyFee, advance: rentalParams.monthlyRent * 2,
              duration: 12, startDate: new Date(rentalParams.startDate)
            }),
            status: 'active' as const
          };
          await dbService.contracts.create(contractPayload);
          await dbService.properties.update(property.id, { is_available: false });
          refetch();
          setSuccessMessage({ title: 'Mise à jour complétée', message: `Locataire mis à jour et nouveau contrat généré pour ${property.title}.` });
          if (confirm('Voulez-vous imprimer le nouveau contrat ?')) {
            await OHADAContractGenerator.printContract(contractPayload, agency, tenantForContract, property);
          }
        }
      } else {
        await handleAddTenant(tenantData, rentalParams, property);
      }
    } catch (error) {
      console.error('Form Submit Error:', error);
      toast.error("Une erreur s'est produite lors de l'enregistrement.");
    }
  }, [isEditing, selectedTenant, updateTenant, handleAddTenant, user?.agency_id]);

  const handleDeleteTenant = useCallback(async (tenantId: string) => {
    if (!confirm('Supprimer ce locataire ? Cette action supprimera également tous les contrats et quittances associés.')) return;
    const toastId = toast.loading('Suppression en cours...');
    try {
      const tenantContracts = await dbService.contracts.getAll({ tenant_id: tenantId, agency_id: user?.agency_id ?? undefined });
      for (const contract of tenantContracts) {
        const receipts = await dbService.rentReceipts.getAll({ contract_id: contract.id, agency_id: user?.agency_id ?? undefined });
        for (const receipt of receipts) await dbService.rentReceipts.delete(receipt.id);
        await dbService.contracts.delete(contract.id);
        if (contract.type === 'location' && contract.property_id) {
          await dbService.properties.update(contract.property_id, { is_available: true });
        }
      }
      await deleteTenant(tenantId);
      toast.success('Locataire et toutes les données associées supprimés avec succès', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors de la suppression: ' + (err.message || ''), { id: toastId });
    }
  }, [deleteTenant, user?.agency_id]);

  const handleExport = () => {
    try {
      const dataToExport = formatTenantsForExport(filteredTenants);
      exportToExcel(dataToExport, 'Locataires_Gestion360', 'Locataires');
      toast.success('Export Excel réussi !');
    } catch (error) {
      toast.error('Erreur lors de l’export');
    }
  };

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => {
      const tenant = t as TenantWithRental;
      const s = searchTerm.toLowerCase();
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const ns = normalize(searchTerm);

      const isOccupying = tenant.active_contracts && tenant.active_contracts.length > 0;
      const statusLabel = isOccupying ? 'occupant' : 'en attente';
      const alternateStatusLabel = isOccupying ? 'actif' : 'libre';

      const matchesSearch = !s ||
        (tenant.first_name || "").toLowerCase().includes(s) ||
        (tenant.last_name || "").toLowerCase().includes(s) ||
        (tenant.phone || "").includes(s) ||
        (tenant.profession || "").toLowerCase().includes(s) ||
        (tenant.city || "").toLowerCase().includes(s) ||
        normalize(statusLabel).includes(ns) ||
        normalize(alternateStatusLabel).includes(ns);

      const matchesMarital = filters.maritalStatus === 'all' || tenant.marital_status === filters.maritalStatus;
      const matchesPayment = filters.paymentStatus === 'all' || tenant.payment_status === filters.paymentStatus;

      const matchesOccupancy = filterOccupancy === 'all' ||
        (filterOccupancy === 'active' && isOccupying) ||
        (filterOccupancy === 'free' && !isOccupying);

      return matchesSearch && matchesMarital && matchesPayment && matchesOccupancy;
    });
  }, [tenants, searchTerm, filters, filterOccupancy]);

  useEffect(() => { refetch(); }, [searchTerm, filters, currentPage, refetch]);
  useEffect(() => { if (action === 'new') handleCreateClick(); }, [action, handleCreateClick]);

  const totalPages = Math.ceil((tenants?.length || 0) / PAGE_SIZE);

  if (authLoading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={refetch}>Réessayer</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locataires</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filteredTenants.length} locataire{filteredTenants.length !== 1 ? 's' : ''} trouvé{filteredTenants.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle view={viewMode} onChange={setViewMode} />
          
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center space-x-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>

          <Button onClick={handleCreateClick} aria-label="Ajouter un locataire" className="shadow-md hover:shadow-lg transition-all">
            <Plus className="h-4 w-4 mr-2" />
            <span>Nouveau Locataire</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <FilterBar
          fields={[
            {
              id: 'paymentStatus',
              label: 'Statut Paiement',
              type: 'select',
              options: [
                { value: 'bon', label: 'Bon payeur' },
                { value: 'irregulier', label: 'Payeur irrégulier' },
                { value: 'mauvais', label: 'Mauvais payeur' },
              ]
            },
            {
              id: 'maritalStatus',
              label: 'Statut Matrimonial',
              type: 'select',
              options: [
                { value: 'celibataire', label: 'Célibataire' },
                { value: 'marie', label: 'Marié(e)' },
                { value: 'divorce', label: 'Divorcé(e)' },
                { value: 'veuf', label: 'Veuf/Veuve' },
              ]
            }
          ]}
          values={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Rechercher par nom, téléphone, ville…"
          stats={[
            {
              label: 'Tous',
              count: stats.total,
              active: filterOccupancy === 'all',
              onClick: () => setFilterOccupancy('all')
            },
            {
              label: 'Actifs',
              count: stats.active,
              active: filterOccupancy === 'active',
              onClick: () => setFilterOccupancy('active'),
              activeColorClass: 'text-emerald-600',
              colorClass: 'bg-emerald-100'
            },
            {
              label: 'Libres',
              count: stats.free,
              active: filterOccupancy === 'free',
              onClick: () => setFilterOccupancy('free'),
              activeColorClass: 'text-amber-600',
              colorClass: 'bg-amber-100'
            }
          ]}
        />
      </Card>

      {/* Content */}
      <div className={clsx(
        viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      )}>
        {initialLoading ? (
          // Skeleton loaders
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-px bg-gray-50" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-7 bg-gray-100 rounded-lg" />
            </div>
          ))
        ) : filteredTenants.length === 0 ? (
          <div className="col-span-full flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucun locataire</h3>
            <p className="text-gray-500 text-sm mb-5">Commencez par ajouter votre premier locataire.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un locataire
            </Button>
          </div>
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profession</th>
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
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(`${tenant.first_name} ${tenant.last_name}`)} flex items-center justify-center text-white font-bold text-xs`}>
                            {tenant.first_name[0]}{tenant.last_name[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors truncate">{tenant.first_name} {tenant.last_name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{tenant.business_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.profession || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", pCfg.bg, pCfg.color)}>
                          {pCfg.label}
                        </span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <Button variant="outline" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} aria-label="Page précédente">
            Précédent
          </Button>
          <span className="text-sm text-gray-600 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
            {currentPage + 1} / {totalPages}
          </span>
          <Button variant="outline" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} aria-label="Page suivante">
            Suivant
          </Button>
        </div>
      )}

      {/* Modals */}
      <TenantForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
        initialData={isEditing && selectedTenant ? selectedTenant : undefined}
        preSelectedPropertyId={queryPropertyId || undefined}
        isLoading={creatingTenant}
      />
      <ReceiptGenerator
        isOpen={showReceiptGenerator}
        onClose={() => { setShowReceiptGenerator(false); setSelectedTenant(null); }}
        tenantId={selectedTenant?.id ?? ''}
        contractId={selectedTenant?.contractId}
        propertyId={selectedTenant?.propertyId}
        ownerId={selectedTenant?.ownerId}
      />
      {selectedTenant && (
        <Modal
          isOpen={showFinancialStatements}
          onClose={() => { setShowFinancialStatements(false); setSelectedTenant(null); }}
          title="État financier"
          size="xl"
        >
          <FinancialStatements
            entityId={selectedTenant.id}
            entityType="tenant"
            entityName={`${selectedTenant.first_name} ${selectedTenant.last_name}`}
          />
        </Modal>
      )}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        message={successMessage.message}
      />
      {tenantToLink && (
        <LinkTenantToPropertyModal
          isOpen={!!tenantToLink}
          onClose={() => setTenantToLink(null)}
          tenant={tenantToLink}
          onLinked={() => { setTenantToLink(null); refetch(); }}
        />
      )}
    </div>
  );
};
