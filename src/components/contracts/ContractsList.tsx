import React, { useState } from 'react';
import { Plus, Search, FileText, Calendar, DollarSign, Eye, Edit, Trash2, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ContractForm } from './ContractForm';
import { Contract, ContractFormData } from '../../types/contract';
import { useSupabaseData, useSupabaseCreate, useSupabaseDelete } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeData } from '../../hooks/useSupabaseData';

export const ContractsList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Supabase data hooks
  const { data: contracts, loading, error, refetch, setData } = useRealtimeData<Contract>(
    dbService.getContracts,
    'contracts'
  );

  const { create: createContract, loading: creating } = useSupabaseCreate(
    dbService.createContract,
    (newContract) => {
      setData(prev => [newContract, ...prev]);
      setShowForm(false);
    }
  );

  const { deleteItem: deleteContract, loading: deleting } = useSupabaseDelete(
    dbService.deleteContract,
    () => refetch()
  );

  const handleAddContract = async (contractData: ContractFormData) => {
    if (!user?.agencyId) return;
    
    try {
      // Validation des données avant envoi
      if (!contractData.propertyId || !contractData.ownerId || !contractData.tenantId) {
        throw new Error('Données obligatoires manquantes');
      }
      
      await createContract({
        agency_id: user.agencyId,
        property_id: contractData.propertyId,
        owner_id: contractData.ownerId,
        tenant_id: contractData.tenantId,
        type: contractData.type,
        start_date: contractData.startDate,
        end_date: contractData.endDate || null,
        monthly_rent: contractData.monthlyRent || null,
        sale_price: contractData.salePrice || null,
        deposit: contractData.deposit || null,
        charges: contractData.charges || null,
        commission_rate: contractData.commissionRate,
        commission_amount: contractData.commissionAmount,
        status: contractData.status,
        terms: contractData.terms,
        documents: contractData.documents || [],
      });
      
      // Fermer le formulaire après succès
      setShowForm(false);
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Erreur lors de la création du contrat. Veuillez réessayer.');
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) {
      try {
        await deleteContract(contractId);
      } catch (error) {
        console.error('Error deleting contract:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'expired': return 'danger';
      case 'terminated': return 'secondary';
      case 'renewed': return 'info';
      default: return 'secondary';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'location': return 'info';
      case 'vente': return 'success';
      case 'gestion': return 'warning';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.id.includes(searchTerm) ||
                         contract.terms.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || contract.type === filterType;
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Erreur: {error}</p>
        <Button onClick={refetch}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats</h1>
          <p className="text-gray-600 mt-1">
            Gestion des contrats de location et de vente
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Nouveau contrat</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par ID ou termes du contrat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les types</option>
              <option value="location">Location</option>
              <option value="vente">Vente</option>
              <option value="gestion">Gestion</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="active">Actif</option>
              <option value="expired">Expiré</option>
              <option value="terminated">Résilié</option>
              <option value="renewed">Renouvelé</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Contracts List */}
      <div className="space-y-4">
        {filteredContracts.map((contract) => (
          <Card key={contract.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Contrat #{contract.id}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Propriété #{contract.property_id} • Propriétaire #{contract.owner_id}
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
                    <p className="text-xs text-gray-500">
                      {contract.type === 'location' ? 'Loyer' : 'Prix de vente'}
                    </p>
                    <p className="text-sm font-medium">
                      {formatCurrency(contract.monthly_rent || contract.sale_price || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Commission ({contract.commission_rate}%)</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(contract.commission_amount)}
                    </p>
                  </div>
                  {contract.deposit && (
                    <div>
                      <p className="text-gray-500">Caution</p>
                      <p className="font-medium text-blue-600">
                        {formatCurrency(contract.deposit)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {contract.terms}
              </p>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Créé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteContract(contract.id)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun contrat trouvé
          </h3>
          <p className="text-gray-600 mb-4">
            Commencez par créer votre premier contrat.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrat
          </Button>
        </div>
      )}

      <ContractForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAddContract}
      />
    </div>
  );
};