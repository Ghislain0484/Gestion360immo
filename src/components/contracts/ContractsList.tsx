import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  DollarSign,
  Eye,
  Trash2,
  Download,
} from 'lucide-react';
import { debounce } from 'lodash';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ContractForm } from './ContractForm';
import { useRealtimeData, useSupabaseCreate, useSupabaseDelete } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Contract } from '../../types/db';
import toast from 'react-hot-toast';

export const ContractsList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | Contract['type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Contract['status']>('all');

  const { data: contracts = [], refetch, setData } = useRealtimeData<Contract>(
    () => dbService.contracts.getAll(),
    'contracts'
  );

  const { create: createContract } = useSupabaseCreate<Contract>(dbService.contracts.create, {
    onSuccess: (newContract: Contract) => {
      setData(prev => (prev ? [newContract, ...prev] : [newContract]));
      setShowForm(false);
      toast.success('Contrat créé avec succès !');
    },
    onError: (err: string) => toast.error(err),
  });

  const { deleteItem: deleteContract } = useSupabaseDelete(dbService.contracts.delete, {
    onSuccess: () => {
      refetch();
      toast.success('Contrat supprimé !');
    },
    onError: (err: string) => toast.error(err),
  });

  const debouncedSetSearchTerm = useCallback(debounce((value: string) => setSearchTerm(value), 300), []);

  const handleAddContract = async (contractData: Partial<Contract>) => {
    if (!user?.agency_id) {
      toast.error('Aucune agence associée');
      return;
    }

    try {
      if (!contractData.property_id?.trim()) throw new Error("ID de la propriété requis");
      if (!contractData.owner_id?.trim()) throw new Error("ID du propriétaire requis");
      if (!contractData.tenant_id?.trim()) throw new Error("ID du locataire requis");
      if (!contractData.type) throw new Error("Type de contrat requis");
      if (!contractData.start_date) throw new Error("Date de début requise");
      if (!contractData.terms?.trim()) throw new Error("Termes du contrat requis");

      const contractPayload: Partial<Contract> = {
        agency_id: user.agency_id,
        property_id: contractData.property_id,
        owner_id: contractData.owner_id,
        tenant_id: contractData.tenant_id,
        type: contractData.type,
        start_date: contractData.start_date,
        end_date: contractData.end_date || null,
        monthly_rent: contractData.monthly_rent || null,
        sale_price: contractData.sale_price || null,
        deposit: contractData.deposit || null,
        charges: contractData.charges || null,
        commission_rate: contractData.commission_rate ?? 10,
        commission_amount: contractData.commission_amount ?? 0,
        status: contractData.status ?? 'draft',
        terms: contractData.terms,
        documents: contractData.documents || [],
      };

      await createContract(contractPayload);
    } catch (err: any) {
      console.error('Erreur création contrat:', err);
      toast.error(err.message || 'Erreur lors de la création du contrat');
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (confirm('Supprimer ce contrat ?')) {
      await deleteContract(contractId);
    }
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
      const matchesSearch =
        contract.id.includes(searchTerm) ||
        (contract.terms || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || contract.type === filterType;
      const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contracts, searchTerm, filterType, filterStatus]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats</h1>
          <p className="text-gray-600 mt-1">Gestion des contrats ({contracts.length})</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
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
              placeholder="Rechercher par ID ou termes..."
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

      {/* Liste */}
      {filteredContracts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun contrat</h3>
          <p className="text-gray-600 mb-4">Commencez par créer votre premier contrat.</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrat
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Contrat #{contract.id}</h3>
                      <p className="text-sm text-gray-500">Propriété #{contract.property_id}</p>
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
                      <p className="text-sm font-medium">{new Date(contract.start_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  {contract.end_date && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-xs text-gray-500">Fin</p>
                        <p className="text-sm font-medium">{new Date(contract.end_date).toLocaleDateString('fr-FR')}</p>
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
                  <div className="text-xs text-gray-500">Créé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}</div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => alert('Visualisation non implémentée')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => alert('Téléchargement non implémenté')}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteContract(contract.id)}>
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
      <ContractForm isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleAddContract} />
    </div>
  );
};
