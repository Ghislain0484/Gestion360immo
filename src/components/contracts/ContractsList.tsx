import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, FileText, Calendar, DollarSign, Eye, Trash2, Download, Printer, Edit, RotateCw, XCircle } from 'lucide-react';
import { debounce } from 'lodash';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ContractForm } from './ContractForm';
import { useRealtimeData, useSupabaseCreate, useSupabaseUpdate, useSupabaseDelete } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Contract, Owner, Property, Tenant } from '../../types/db';
import { OHADAContractGenerator } from '../../utils/contractTemplates';
import toast from 'react-hot-toast';

export const ContractsList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState<{ open: boolean; contract?: Partial<Contract>; readOnly?: boolean }>({ open: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | Contract['type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Contract['status']>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: contracts = [], refetch, setData, initialLoading } = useRealtimeData<Contract>(
    () => dbService.contracts.getAll({
      agency_id: user?.agency_id,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      search: searchTerm,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    }),
    'contracts',
    { agency_id: user?.agency_id, limit: pageSize, offset: (page - 1) * pageSize, search: searchTerm, status: filterStatus !== 'all' ? filterStatus : undefined }
  );

  // Fetch related data for enhanced search
  const { data: owners = [] } = useRealtimeData<Owner>(
    () => dbService.owners.getAll({ agency_id: user?.agency_id }),
    'owners',
    { agency_id: user?.agency_id }
  );
  const { data: properties = [] } = useRealtimeData<Property>(
    () => dbService.properties.getAll({ agency_id: user?.agency_id }),
    'properties',
    { agency_id: user?.agency_id }
  );
  const { data: tenants = [] } = useRealtimeData<Tenant>(
    () => dbService.tenants.getAll({ agency_id: user?.agency_id }),
    'tenants',
    { agency_id: user?.agency_id }
  );

  const { create: createContract } = useSupabaseCreate<Contract>(dbService.contracts.create, {
    onSuccess: (newContract: Contract) => {
      setData((prev) => (prev ? [newContract, ...prev] : [newContract]));
      setShowForm({ open: false });
      toast.success('Contrat créé avec succès !');
    },
    onError: (err: string) => toast.error(err),
    successMessage: 'Contrat créé avec succès !',
    errorMessage: 'Erreur lors de la création du contrat',
  });

  const { update: updateContract } = useSupabaseUpdate<Contract>(
    dbService.contracts.update,
    {
      onSuccess: (updatedContract: Contract) => {
        setData((prev) =>
          prev ? prev.map((c) => (c.id === updatedContract.id ? updatedContract : c)) : [updatedContract]
        );
        setShowForm({ open: false });
        toast.success('Contrat mis à jour avec succès !');
      },
      onError: (err: string) => toast.error(err),
      successMessage: 'Contrat mis à jour avec succès !',
      errorMessage: 'Erreur lors de la mise à jour du contrat',
    }
  );

  const { deleteItem: deleteContract } = useSupabaseDelete(dbService.contracts.delete, {
    onSuccess: () => {
      refetch();
      toast.success('Contrat supprimé !');
    },
    onError: (err: string) => toast.error(err),
    successMessage: 'Contrat supprimé !',
    errorMessage: 'Erreur lors de la suppression du contrat',
  });

  const debouncedSetSearchTerm = useCallback(debounce((value: string) => setSearchTerm(value), 300), []);

  const handleAddOrUpdateContract = async (contractData: Partial<Contract>, isUpdate: boolean = false) => {
    if (!user?.agency_id) {
      toast.error('Aucune agence associée');
      return;
    }

    try {
      if (!contractData.property_id?.trim()) throw new Error('ID de la propriété requis');
      if (!contractData.owner_id?.trim()) throw new Error('ID du propriétaire requis');
      if (!contractData.tenant_id?.trim()) throw new Error('ID du locataire requis');
      if (!contractData.type) throw new Error('Type de contrat requis');
      if (!contractData.start_date) throw new Error('Date de début requise');
      if (!contractData.terms?.trim()) throw new Error('Termes du contrat requis');

      const contractPayload: Partial<Contract> = {
        id: contractData.id,
        agency_id: user.agency_id,
        property_id: contractData.property_id,
        owner_id: contractData.owner_id,
        tenant_id: contractData.tenant_id,
        type: contractData.type,
        start_date: contractData.start_date,
        end_date: contractData.end_date,
        monthly_rent: contractData.monthly_rent,
        sale_price: contractData.sale_price,
        deposit: contractData.deposit,
        charges: contractData.charges,
        commission_rate: contractData.commission_rate ?? 10,
        commission_amount: contractData.commission_amount ?? 0,
        status: contractData.status ?? 'draft',
        terms: contractData.terms,
        documents: contractData.documents || [],
      };

      if (isUpdate && contractPayload.id) {
        await updateContract(contractPayload.id, contractPayload);
      } else {
        await createContract(contractPayload);
      }

      // Synchronisation du statut du bien (Uniquement pour les contrats de location)
      if (contractPayload.type === 'location') {
        if (contractPayload.status === 'active' && contractPayload.property_id) {
          console.log('🏘️ Bien marqué comme occupé (Location):', contractPayload.property_id);
          await dbService.properties.update(contractPayload.property_id, { is_available: false });
        } else if (['expired', 'terminated'].includes(contractPayload.status || '') && contractPayload.property_id) {
          console.log('🏘️ Bien marqué comme libre (Location terminée):', contractPayload.property_id);
          await dbService.properties.update(contractPayload.property_id!, { is_available: true });
        }
      }

      setShowForm({ open: false });
    } catch (err: any) {
      console.error('Erreur lors de la gestion du contrat:', err);
      toast.error(err.message || 'Erreur lors de la gestion du contrat');
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce contrat ? Cette action est irréversible.')) {
      const contractToDelete = contracts.find(c => c.id === contractId);
      await deleteContract(contractId);

      if (contractToDelete && contractToDelete.status === 'active' && contractToDelete.type === 'location') {
        console.log('🏘️ Restauration de la disponibilité du bien:', contractToDelete.property_id);
        await dbService.properties.update(contractToDelete.property_id, { is_available: true });
      }
    }
  };

  const handleTerminateContract = async (contract: Contract) => {
    if (confirm('Voulez-vous résilier ce contrat ? Le bien sera marqué comme disponible.')) {
      try {
        await updateContract(contract.id, {
          status: 'terminated',
          end_date: new Date().toISOString().split('T')[0]
        });

        if (contract.type === 'location') {
          await dbService.properties.update(contract.property_id, { is_available: true });
          toast.success('Contrat résilié et bien libéré');
        } else {
          toast.success('Contrat résilié');
        }
      } catch (err) {
        toast.error('Erreur lors de la résiliation');
      }
    }
  };

  const handleRenewContract = (contract: Contract) => {
    // Open form in edit mode but with updated dates and 'renewed' status logic if needed
    // For now, just open the form to let user adjust dates
    openForm({
      ...contract,
      id: undefined,
      status: 'draft',
      start_date: contract.end_date || new Date().toISOString().split('T')[0],
      end_date: undefined
    });
    toast.success('Préparation du renouvellement (Brouillon)...');
  };

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'expired': return 'danger';
      case 'terminated': return 'secondary';
      case 'renewed': return 'info';
      default: return 'secondary';
    }
  };

  const getTypeColor = (type: Contract['type']) => {
    switch (type) {
      case 'location': return 'info';
      case 'vente': return 'success';
      case 'gestion': return 'warning';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract: Contract) => {
      const owner = owners.find((o) => o.id === contract.owner_id);
      const property = properties.find((p) => p.id === contract.property_id);
      const tenant = tenants.find((t) => t.id === contract.tenant_id);
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        contract.id.includes(searchLower) ||
        (contract.terms || '').toLowerCase().includes(searchLower) ||
        (owner ? `${owner.first_name} ${owner.last_name}`.toLowerCase().includes(searchLower) : false) ||
        (property ? property.title.toLowerCase().includes(searchLower) : false) ||
        (tenant ? `${tenant.first_name} ${tenant.last_name}`.toLowerCase().includes(searchLower) : false);
      const matchesType = filterType === 'all' || contract.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [contracts, owners, properties, tenants, searchTerm, filterType]);

  const openForm = (contract?: Partial<Contract>, readOnly: boolean = false) =>
    setShowForm({ open: true, contract, readOnly });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-100 p-2 flex items-center justify-center overflow-hidden">
            {user?.agencies?.find(a => a.agency_id === user.agency_id)?.logo_url ? (
              <img
                src={user.agencies.find(a => a.agency_id === user.agency_id)?.logo_url || ''}
                alt="Logo Agence"
                className="w-full h-full object-contain"
              />
            ) : (
              <FileText className="h-8 w-8 text-blue-600" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contrats</h1>
            <p className="text-gray-600 mt-1">Gestion des contrats {user?.agencies?.find(a => a.agency_id === user.agency_id)?.name && `de ${user.agencies.find(a => a.agency_id === user.agency_id)?.name}`} ({contracts.length})</p>
          </div>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contrat
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par ID, termes, propriétaire, propriété, locataire..."
              onChange={(e) => debouncedSetSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | Contract['type'])}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous types</option>
            <option value="location">Location</option>
            <option value="vente">Vente</option>
            <option value="gestion">Gestion</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | Contract['status'])}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous statuts</option>
            <option value="draft">Brouillon</option>
            <option value="active">Actif</option>
            <option value="expired">Expiré</option>
            <option value="terminated">Résilié</option>
            <option value="renewed">Renouvelé</option>
          </select>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1 || initialLoading}
        >
          Précédent
        </Button>
        <span>Page {page}</span>
        <Button
          onClick={() => setPage((prev) => prev + 1)}
          disabled={contracts.length < pageSize || initialLoading}
        >
          Suivant
        </Button>
      </div>

      {/* Liste */}
      {initialLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Chargement des contrats...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun contrat</h3>
          <p className="text-gray-600 mb-4">Commencez par créer votre premier contrat.</p>
          <Button onClick={() => openForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrat
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContracts.map((contract) => (
            <Card
              key={contract.id}
              className="hover:shadow-lg transition-all cursor-pointer border-transparent hover:border-blue-200 group"
              onClick={() => openForm(contract, true)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Contrat #{contract.id.slice(0, 8)}</h3>
                      <p className="text-sm text-gray-500">
                        Propriété: {properties.find((p) => p.id === contract.property_id)?.title || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getTypeColor(contract.type)} size="sm">
                      {contract.type.charAt(0).toUpperCase() + contract.type.slice(1)}
                    </Badge>
                    <Badge variant={getStatusColor(contract.status)} size="sm">
                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">Début</p>
                      <p className="text-sm font-medium">
                        {new Date(contract.start_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {contract.end_date && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-xs text-gray-500">Fin</p>
                        <p className="text-sm font-medium">
                          {new Date(contract.end_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-xs text-gray-500">Commission</p>
                      <p className="text-sm font-medium">{formatCurrency(contract.commission_amount)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Créé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openForm(contract, true);
                      }}
                      title="Voir les détails"
                      className="p-1 h-8 w-8 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openForm(contract, false); // Edit mode
                      }}
                      title="Modifier le contrat"
                      className="p-1 h-8 w-8 text-orange-600 hover:bg-orange-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {contract.status === 'active' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenewContract(contract);
                          }}
                          title="Renouveler"
                          className="p-1 h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTerminateContract(contract);
                          }}
                          title="Résilier"
                          className="p-1 h-8 w-8 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const print = async () => {
                          if (!user?.agency_id) {
                            toast.error("Impossible d'identifier l'agence");
                            return;
                          }

                          const printWindow = window.open('', '_blank');
                          if (!printWindow) {
                            toast.error("Pop-up bloqué. Veuillez autoriser les pop-ups pour imprimer.");
                            return;
                          }

                          printWindow.document.write('<div style="font-family: Arial; padding: 20px;">Chargement du contrat en cours...</div>');

                          try {
                            const fullAgency = await dbService.agencies.getById(user.agency_id);
                            const fullTenant = tenants.find(t => t.id === contract.tenant_id);
                            const fullOwner = owners.find(o => o.id === contract.owner_id);
                            const fullProperty = properties.find(p => p.id === contract.property_id);

                            // Pour un contrat de gestion, le "client" est le propriétaire
                            const clientData = contract.type === 'gestion' ? fullOwner : fullTenant;

                            if (fullAgency && clientData) {
                              printWindow.document.body.innerHTML = '';
                              await OHADAContractGenerator.printContract(contract, fullAgency, clientData, fullProperty, printWindow);
                            } else {
                              printWindow.close();
                              toast.error("Impossible de récupérer les informations nécessaires");
                            }
                          } catch (error) {
                            printWindow.close();
                            console.error("Print error", error);
                            toast.error("Erreur lors de l'impression");
                          }
                        };
                        print();
                      }}
                      title="Imprimer"
                      className="p-1 h-8 w-8 text-gray-600 hover:bg-gray-50"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!contract.documents?.length}
                      onClick={async (e) => {
                        e.stopPropagation();
                        for (const url of contract.documents || []) {
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = url.split('/').pop() || 'document';
                          link.click();
                        }
                      }}
                      title="Télécharger les documents"
                      className="p-1 h-8 w-8 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContract(contract.id);
                      }}
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Formulaire modale */}
      <ContractForm
        isOpen={showForm.open}
        onClose={() => setShowForm({ open: false })}
        onSubmit={handleAddOrUpdateContract}
        initialData={showForm.contract}
        readOnly={showForm.readOnly}
      />
    </div>
  );
};