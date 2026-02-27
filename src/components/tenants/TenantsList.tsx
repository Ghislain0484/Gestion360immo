import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, User, Phone, MapPin, Briefcase, FileText, DollarSign, Trash2, Edit } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { TenantForm } from './TenantForm';
import ReceiptGenerator from '../receipts/ReceiptGenerator';
import { FinancialStatements } from '../financial/FinancialStatements';
import { Tenant, TenantFormData, TenantWithRental } from '../../types/db';
import { useRealtimeData, useSupabaseCreate, useSupabaseDelete, useSupabaseUpdate } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { OHADAContractGenerator } from '../../utils/contractTemplates';
import { generateSlug } from '../../utils/idSystem';
import { useAuth } from '../../contexts/AuthContext';
import debounce from 'lodash/debounce';
import { SuccessModal } from '../ui/SuccessModal';
import { toast } from 'react-hot-toast';

const PAGE_SIZE = 10;

export const TenantsList: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const isDirector = user?.role === 'director';
  const isManager = user?.role === 'manager';
  const isDirectorOrManager = isDirector || isManager;
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showReceiptGenerator, setShowReceiptGenerator] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithRental | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'all' | 'bon' | 'irregulier' | 'mauvais'>('all');
  const [filterMaritalStatus, setFilterMaritalStatus] = useState<'all' | 'celibataire' | 'marie' | 'divorce' | 'veuf'>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  const queryPropertyId = searchParams.get('propertyId');

  const fetchTenants = useCallback(
    () => dbService.tenants.getAll({
      agency_id: user?.agency_id ?? undefined,
      limit: PAGE_SIZE,
      offset: currentPage * PAGE_SIZE,
      search: searchTerm,
      marital_status: filterMaritalStatus === 'all' ? undefined : filterMaritalStatus,
      payment_status: filterPaymentStatus === 'all' ? undefined : filterPaymentStatus
    }),
    [user?.agency_id, currentPage, searchTerm, filterMaritalStatus, filterPaymentStatus]
  );

  const { data: tenants, initialLoading, error, setData, refetch } = useRealtimeData<Tenant>(
    fetchTenants,
    'tenants'
  );



  const { deleteItem: deleteTenant, loading: deleting } = useSupabaseDelete(
    dbService.tenants.delete,
    {
      onSuccess: () => {
        refetch();
        toast.success('Locataire supprimé avec succès');
      },
      onError: (err) => toast.error(err)
    }
  );

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  const { update: updateTenant } = useSupabaseUpdate(
    dbService.tenants.update,
    {
      onSuccess: (updatedTenant) => {
        // Optimistic update
        setData(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
        refetch(); // Force sync with server
        setShowForm(false);
        setIsEditing(false);
        setSuccessMessage({
          title: 'Mise à jour réussie !',
          message: `Les informations de ${updatedTenant.first_name} ${updatedTenant.last_name} ont bien été enregistrées.`
        });
        setShowSuccessModal(true);
      },
      onError: (err) => {
        console.error("Update Error:", err);
        toast.error("Erreur lors de la mise à jour : " + err);
      }
    }
  );

  const { create: createTenant, loading: creatingTenant } = useSupabaseCreate(
    dbService.tenants.create,
    {
      onSuccess: () => {
        refetch(); // Force sync
      },
      onError: (err) => toast.error(err)
    }
  );

  const handleAddTenant = useCallback(async (tenantData: TenantFormData, rentalParams?: any, property?: any) => {
    if (!user?.agency_id) {
      toast.error('Aucune agence associée');
      return;
    }

    try {
      const tenantPayload = { ...tenantData, agency_id: user.agency_id };
      // Note: createTenant is triggered, but we need to handle contract in onSuccess ideally,
      // but useSupabaseCreate structure is simple.
      // We will rely on the direct calls inside the form submit wrapper for complex Logic like contracts.

      // ACTUALLY: The hook useSupabaseCreate wraps the DB call.
      // To chain logic (Contract), we might need to do it slightly differently or inside the component logic.
      // Current implementation: handleFormSubmit calls handleAddTenant, which calls createTenant hook.

      // Let's execute create manually to await it, IF the hook exposes the promise.
      // useSupabaseCreate usually exposes { create }.

      const newTenant = await createTenant(tenantPayload);

      if (newTenant && rentalParams && property) {
        toast.loading('Génération du contrat en cours...', { id: 'contract-gen' });

        const agency = await dbService.agencies.getById(user.agency_id);
        const owner = await dbService.owners.getById(property.owner_id);

        if (!agency || !owner) {
          toast.error('Erreur: Agence ou Propriétaire introuvable pour le contrat', { id: 'contract-gen' });
          return;
        }

        const contractPayload = {
          ...OHADAContractGenerator.generateRentalContractForTenant(
            newTenant,
            agency,
            property,
            {
              monthlyRent: rentalParams.monthlyRent,
              deposit: rentalParams.deposit, // 2 months
              agencyFee: rentalParams.agencyFee, // 1 month
              advance: rentalParams.monthlyRent * 2, // 2 months advance
              duration: 12,
              startDate: new Date(rentalParams.startDate)
            }
          ),
          status: 'active' as const
        };

        await dbService.contracts.create(contractPayload);
        await dbService.properties.update(property.id, { is_available: false });

        // Force refetch to sync all data
        refetch();

        if (confirm("Voulez-vous imprimer le contrat de bail maintenant ?")) {
          await OHADAContractGenerator.printContract(contractPayload, agency, newTenant, property);
        }

        toast.dismiss('contract-gen');
      } else {
        setSuccessMessage({
          title: 'Locataire créé !',
          message: `Le locataire a été ajouté à la base de données.`
        });
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

        // 2. If property assigned during edit, generate Contract
        if (rentalParams && property) {
          toast.loading('Génération du nouveau contrat...', { id: 'contract-update' });

          const agency = await dbService.agencies.getById(user?.agency_id!);
          const owner = await dbService.owners.getById(property.owner_id);

          if (!agency || !owner) {
            toast.error('Erreur: Introuvables pour le contrat', { id: 'contract-update' });
            return;
          }

          const tenantForContract: Tenant = { ...selectedTenant, ...tenantData };

          const contractPayload = {
            ...OHADAContractGenerator.generateRentalContractForTenant(
              tenantForContract,
              agency,
              property,
              {
                monthlyRent: rentalParams.monthlyRent,
                deposit: rentalParams.deposit,
                agencyFee: rentalParams.agencyFee,
                advance: rentalParams.monthlyRent * 2,
                duration: 12,
                startDate: new Date(rentalParams.startDate)
              }
            ),
            status: 'active' as const
          };

          await dbService.contracts.create(contractPayload);
          await dbService.properties.update(property.id, { is_available: false });
          refetch();

          // Append info to success message
          setSuccessMessage({
            title: 'Mise à jour complétée',
            message: `Locataire mis à jour et nouveau contrat généré pour ${property.title}.`
          });

          if (confirm("Voulez-vous imprimer le nouveau contrat ?")) {
            await OHADAContractGenerator.printContract(contractPayload, agency, tenantForContract, property);
          }
        }

      } else {
        await handleAddTenant(tenantData, rentalParams, property);
      }
    } catch (error) {
      console.error("Form Submit Error:", error);
      toast.error("Une erreur s'est produite lors de l'enregistrement.");
    }
  }, [isEditing, selectedTenant, updateTenant, handleAddTenant, user?.agency_id]);

  const handleDeleteTenant = useCallback(async (tenantId: string) => {
    if (!confirm('Supprimer ce locataire ? Cette action supprimera également tous les contrats et quittances associés.')) return;

    const toastId = toast.loading('Suppression en cours...');
    try {
      // 1. Fetch associated contracts first
      const tenantContracts = await dbService.contracts.getAll({ tenant_id: tenantId, agency_id: user?.agency_id ?? undefined });

      if (tenantContracts.length > 0) {
        console.log(`🧹 Nettoyage de ${tenantContracts.length} contrats pour le locataire ${tenantId}`);
        for (const contract of tenantContracts) {
          // 1.1 First delete receipts for this contract
          const receipts = await dbService.rentReceipts.getAll({ contract_id: contract.id, agency_id: user?.agency_id ?? undefined });
          if (receipts.length > 0) {
            console.log(`🧾 Suppression de ${receipts.length} quittances pour le contrat ${contract.id}`);
            for (const receipt of receipts) {
              await dbService.rentReceipts.delete(receipt.id);
            }
          }
          // 1.2 Now delete the contract
          await dbService.contracts.delete(contract.id);

          // 1.3 If it was a rental, free up the property
          if (contract.type === 'location' && contract.property_id) {
            console.log(`🏘️ Libération du bien ${contract.property_id} suite à suppression locataire`);
            await dbService.properties.update(contract.property_id, { is_available: true });
          }
        }
      }

      // 2. Finally delete the tenant
      await deleteTenant(tenantId);

      toast.success('Locataire et toutes les données associées supprimés avec succès', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors de la suppression du locataire: ' + (err.message || ''), { id: toastId });
    }
  }, [deleteTenant, user?.agency_id]);

  const getPaymentStatusColor = (status: Tenant['payment_status']) => {
    switch (status) {
      case 'bon': return 'success';
      case 'irregulier': return 'warning';
      case 'mauvais': return 'danger';
      default: return 'secondary';
    }
  };

  const getPaymentStatusLabel = (status: Tenant['payment_status']) => {
    switch (status) {
      case 'bon': return 'Bon payeur';
      case 'irregulier': return 'Payeur irrégulier';
      case 'mauvais': return 'Mauvais payeur';
      default: return status;
    }
  };

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => {
      const matchesSearch =
        t.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.phone.includes(searchTerm) ||
        t.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMarital = filterMaritalStatus === 'all' || t.marital_status === filterMaritalStatus;
      const matchesPayment = filterPaymentStatus === 'all' || t.payment_status === filterPaymentStatus;

      return matchesSearch && matchesMarital && matchesPayment;
    });
  }, [tenants, searchTerm, filterMaritalStatus, filterPaymentStatus]);

  const debouncedRefetch = useCallback(
    debounce(() => refetch(), 500),
    [refetch]
  );

  useEffect(() => {
    debouncedRefetch();
    return () => debouncedRefetch.cancel();
  }, [searchTerm, filterPaymentStatus, filterMaritalStatus, currentPage, debouncedRefetch]);

  useEffect(() => {
    if (action === 'new') {
      handleCreateClick();
    }
  }, [action, handleCreateClick]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={refetch}>Réessayer</Button>
      </div>
    );
  }

  const totalPages = Math.ceil((tenants?.length || 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Locataires ({filteredTenants.length})</h1>
        <Button onClick={handleCreateClick} aria-label="Ajouter un locataire">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un locataire
        </Button>
      </div>

      <Card>
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Rechercher un locataire"
            />
          </div>
          <select
            value={filterPaymentStatus}
            onChange={e => setFilterPaymentStatus(e.target.value as Tenant['payment_status'] | 'all')}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filtrer par statut de paiement"
          >
            <option value="all">Tous les statuts</option>
            <option value="bon">Bon payeur</option>
            <option value="irregulier">Payeur irrégulier</option>
            <option value="mauvais">Mauvais payeur</option>
          </select>
          <select
            value={filterMaritalStatus}
            onChange={e => setFilterMaritalStatus(e.target.value as Tenant['marital_status'] | 'all')}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filtrer par statut matrimonial"
          >
            <option value="all">Tous les statuts</option>
            <option value="celibataire">Célibataire</option>
            <option value="marie">Marié(e)</option>
            <option value="divorce">Divorcé(e)</option>
            <option value="veuf">Veuf/Veuve</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Aucun locataire</h3>
            <p className="text-gray-600 mb-4">Commencez par ajouter votre premier locataire.</p>
            <Button onClick={() => setShowForm(true)} aria-label="Ajouter un locataire">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un locataire
            </Button>
          </div>
        ) : (
          filteredTenants.map(tenant => (
            <Card
              key={tenant.id}
              className="hover:shadow-lg transition-shadow cursor-pointer relative group"
              onClick={() => {
                const slug = generateSlug(tenant.id, `${tenant.first_name} ${tenant.last_name}`);
                navigate(`/locataires/${slug}`);
              }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-3">
                    {tenant.photo_url
                      ? <img src={tenant.photo_url} alt={`${tenant.first_name} ${tenant.last_name}`} className="w-12 h-12 rounded-full object-cover" />
                      : <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"><User className="h-6 w-6 text-blue-600" /></div>
                    }
                    <div>
                      <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                        {tenant.first_name} {tenant.last_name}
                        {tenant.business_id && (
                          <span className="ml-2 text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">
                            {tenant.business_id}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600"><Phone className="h-3 w-3 mr-1" />{tenant.phone}</div>
                    </div>
                  </div>
                  <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedTenant(tenant); setShowReceiptGenerator(true); }} aria-label={`Générer une quittance pour ${tenant.first_name} ${tenant.last_name}`}>
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(tenant)} aria-label={`Modifier ${tenant.first_name} ${tenant.last_name}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedTenant(tenant); setShowFinancialStatements(true); }} aria-label={`Voir l'état financier de ${tenant.first_name} ${tenant.last_name}`}>
                      <DollarSign className="h-4 w-4" />
                    </Button>
                    {isDirectorOrManager && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteTenant(tenant.id)}
                        disabled={deleting}
                        aria-label={`Supprimer ${tenant.first_name} ${tenant.last_name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600"><MapPin className="h-4 w-4 mr-2 text-green-600" />{tenant.city}</div>
                  <div className="flex items-center text-sm text-gray-600"><Briefcase className="h-4 w-4 mr-2 text-orange-600" />{tenant.profession}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Paiement:</span>
                    <Badge variant={getPaymentStatusColor(tenant.payment_status)} size="sm">
                      {getPaymentStatusLabel(tenant.payment_status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(prev => prev - 1)}
            aria-label="Page précédente"
          >
            Précédent
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} sur {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(prev => prev + 1)}
            aria-label="Page suivante"
          >
            Suivant
          </Button>
        </div>
      )}



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
      {
        selectedTenant && (
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
        )
      }
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        message={successMessage.message}
      />
    </div >
  );
};
