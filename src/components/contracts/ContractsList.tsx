import React, { useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { Plus, Search, FileText, Calendar, DollarSign, Eye, Trash2, Download, Printer, Edit, RotateCw, XCircle, MoreVertical, ShieldCheck, Home } from 'lucide-react';
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

import { useRef, useEffect } from 'react';

// ─── Action Menu Dropdown ────────────────────────────────────────────────────
interface ActionMenuProps {
  contract: Contract;
  onPreview: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onRenew: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onTerminate: () => void;
  onDelete: () => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  contract, onPreview, onEdit, onRegenerate, onRenew, onPrint, onDownload, onTerminate, onDelete
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
        aria-label="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 animate-scaleIn">
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            onClick={() => { onPreview(); setOpen(false); }}
          >
            <Eye className="h-4 w-4 text-blue-500" />
            Aperçu OHADA
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            onClick={() => { onEdit(); setOpen(false); }}
          >
            <Edit className="h-4 w-4 text-orange-500" />
            Modifier
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            onClick={() => { onRegenerate(); setOpen(false); }}
          >
            <RotateCw className="h-4 w-4 text-purple-500" />
            Mettre aux normes OHADA
          </button>
          
          <div className="my-1 border-t border-gray-100" />
          
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
            onClick={() => { onPrint(); setOpen(false); }}
          >
            <Printer className="h-4 w-4 text-gray-900" />
            Imprimer
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
            onClick={() => { onDownload(); setOpen(false); }}
          >
            <Download className="h-4 w-4 text-green-500" />
            Télécharger (PDF/HTML)
          </button>

          {contract.status === 'active' && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                onClick={() => { onRenew(); setOpen(false); }}
              >
                <RotateCw className="h-4 w-4 text-indigo-500" />
                Renouveler le contrat
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => { onTerminate(); setOpen(false); }}
              >
                <XCircle className="h-4 w-4" />
                Résilier le contrat
              </button>
            </>
          )}

          <div className="my-1 border-t border-gray-100" />
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => { onDelete(); setOpen(false); }}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer définitivement
          </button>
        </div>
      )}
    </div>
  );
};

export const ContractsList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState<{ open: boolean; contract?: Partial<Contract>; readOnly?: boolean }>({ open: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | Contract['type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Contract['status']>('all');
  const [page, setPage] = useState(1);
  const pageSize = 1000;

  const { data: contracts = [], refetch, setData, initialLoading } = useRealtimeData<Contract>(
    () => dbService.contracts.getAll({
      agency_id: user?.agency_id,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      // We perform search client-side only below to allow searching across joined data (tenants/properties)
      status: filterStatus === 'active' ? undefined : (filterStatus !== 'all' ? filterStatus : undefined),
    }),
    'contracts',
    { agency_id: user?.agency_id, limit: pageSize, offset: (page - 1) * pageSize, status: filterStatus === 'active' ? undefined : (filterStatus !== 'all' ? filterStatus : undefined) }
  );

  // Fetch related data for enhanced search
  const { data: owners = [] } = useRealtimeData<Owner>(
    () => dbService.owners.getAll({ agency_id: user?.agency_id, limit: 1000 }),
    'owners',
    { agency_id: user?.agency_id, limit: 1000 }
  );
  const { data: properties = [] } = useRealtimeData<Property>(
    () => dbService.properties.getAll({ agency_id: user?.agency_id, limit: 1000 }),
    'properties',
    { agency_id: user?.agency_id, limit: 1000 }
  );
  const { data: tenants = [] } = useRealtimeData<Tenant>(
    () => dbService.tenants.getAll({ agency_id: user?.agency_id, limit: 1000 }),
    'tenants',
    { agency_id: user?.agency_id, limit: 1000 }
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
        extra_data: contractData.extra_data || {},
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
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' ? (contract.status === 'active' || contract.status === 'renewed') : contract.status === filterStatus);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contracts, owners, properties, tenants, searchTerm, filterType, filterStatus]);

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
      <Card className="p-4 shadow-sm border-none bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col gap-6">
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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100/50">
            <div className="flex items-center gap-2">
              <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Tous', color: 'blue' },
                  { id: 'draft', label: 'Brouillon', color: 'amber' },
                  { id: 'active', label: 'Actifs', color: 'emerald' },
                  { id: 'expired', label: 'Expirés', color: 'rose' },
                  { id: 'terminated', label: 'Résiliés', color: 'gray' },
                  { id: 'renewed', label: 'Renouvelés', color: 'indigo' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id as any)}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                      filterStatus === tab.id 
                        ? `bg-white text-${tab.color}-600 shadow-sm` 
                        : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="primary" className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm border-none">
                {filteredContracts.length}
              </Badge>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                contrat{filteredContracts.length > 1 ? 's' : ''} trouvé{filteredContracts.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Count Badge */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="primary" className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm border-none">
          {filteredContracts.length}
        </Badge>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          contrat{filteredContracts.length > 1 ? 's' : ''} trouvé{filteredContracts.length > 1 ? 's' : ''}
        </span>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContracts.map((contract) => {
            const owner = owners.find(o => o.id === contract.owner_id);
            const tenant = tenants.find(t => t.id === contract.tenant_id);
            const property = properties.find(p => p.id === contract.property_id);
            const clientName = contract.type === 'gestion' 
              ? `${owner?.first_name} ${owner?.last_name}` 
              : `${tenant?.first_name} ${tenant?.last_name}`;

            return (
              <div
                key={contract.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                onClick={() => openForm(contract, true)}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={clsx(
                      "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                      contract.type === 'location' ? "bg-blue-50 text-blue-600" :
                      contract.type === 'gestion' ? "bg-orange-50 text-orange-600" :
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors truncate">
                        {clientName}
                      </h3>
                      <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-0.5">
                        <span className={clsx(
                          contract.type === 'location' ? "text-blue-500" :
                          contract.type === 'gestion' ? "text-orange-500" :
                          "text-emerald-500"
                        )}>
                          {contract.type}
                        </span>
                        <span>•</span>
                        <span>{contract.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                  <ActionMenu
                    contract={contract}
                    onPreview={async () => {
                      if (!user?.agency_id) return;
                      const fullAgency = await dbService.agencies.getById(user.agency_id);
                      const clientData = contract.type === 'gestion' ? owner : tenant;
                      if (fullAgency && clientData) {
                        await OHADAContractGenerator.previewContract(contract, fullAgency, clientData, property);
                      }
                    }}
                    onEdit={() => openForm(contract, false)}
                    onRegenerate={async () => {
                      if (!confirm('Régénérer aux normes OHADA ?')) return;
                      try {
                        const fullAgency = await dbService.agencies.getById(user?.agency_id || '');
                        const newTerms = OHADAContractGenerator.regenerateTerms(contract, fullAgency, tenant, owner, property);
                        await updateContract(contract.id, { terms: newTerms });
                        toast.success('Mis aux normes OHADA !');
                      } catch (err) { toast.error('Erreur'); }
                    }}
                    onRenew={() => handleRenewContract(contract)}
                    onPrint={async () => {
                      if (!user?.agency_id) return;
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) return;
                      try {
                        const fullAgency = await dbService.agencies.getById(user.agency_id);
                        const clientData = contract.type === 'gestion' ? owner : tenant;
                        if (fullAgency && clientData) {
                          await OHADAContractGenerator.printContract(contract, fullAgency, clientData, property, printWindow);
                        } else printWindow.close();
                      } catch { printWindow.close(); }
                    }}
                    onDownload={async () => {
                      if (!user?.agency_id) return;
                      const fullAgency = await dbService.agencies.getById(user.agency_id);
                      const clientData = contract.type === 'gestion' ? owner : tenant;
                      if (fullAgency && clientData) {
                        await OHADAContractGenerator.downloadContract(contract, fullAgency, clientData, property);
                      }
                    }}
                    onTerminate={() => handleTerminateContract(contract)}
                    onDelete={() => handleDeleteContract(contract.id)}
                  />
                </div>

                {/* Divider */}
                <div className="mx-4 border-t border-gray-50" />

                {/* Body */}
                <div className="px-4 py-3 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Home className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate font-medium">{property?.title || 'Bien inconnu'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{new Date(contract.start_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {contract.end_date && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar className="h-3.5 w-3.5 text-rose-500" />
                        <span>{new Date(contract.end_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(contract.monthly_rent || contract.sale_price || 0)}
                      </span>
                    </div>
                    <Badge variant={getStatusColor(contract.status)} size="sm">
                      {contract.status}
                    </Badge>
                  </div>
                </div>

                {/* Footer Transition Info */}
                {contract.extra_data?.is_existing_tenant && (
                  <div className="mx-4 mb-4 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700 uppercase">
                      <RotateCw className="w-3 h-3" />
                      Reprise de bail
                    </div>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                )}
              </div>
            );
          })}
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