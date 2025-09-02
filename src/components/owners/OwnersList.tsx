import React, { useState } from 'react';
import { Plus, Search, MapPin, Phone, FileText, Edit, Trash2, Eye, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { OwnerForm } from './OwnerForm';
import { FinancialStatements } from '../financial/FinancialStatements';
import { OwnerDetailsModal } from './OwnerDetailsModal';
import { Owner, OwnerFormData } from '../../types/owner';
import { useRealtimeData, useSupabaseCreate, useSupabaseDelete } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const OwnersList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaritalStatus, setFilterMaritalStatus] = useState('all');
  const [filterPropertyTitle, setFilterPropertyTitle] = useState('all');

  // Chargement des données
  const { data: owners, loading, error, refetch, setData } = useRealtimeData<Owner>(
    dbService.getOwners,
    'owners'
  );

  const { create: createOwner, loading: creating } = useSupabaseCreate(
    dbService.createOwner,
    (newOwner) => {
      setData(prev => [newOwner, ...prev]);
      setShowForm(false);
    }
  );

  const { deleteItem: deleteOwner, loading: deleting } = useSupabaseDelete(
    dbService.deleteOwner,
    () => refetch()
  );

  const handleAddOwner = async (ownerData: OwnerFormData) => {
    if (!user?.agencyId) {
      alert('Aucune agence associée');
      return;
    }
    
    try {
      const ownerPayload = {
        agency_id: user.agencyId,
        first_name: ownerData.firstName,
        last_name: ownerData.lastName,
        phone: ownerData.phone,
        email: ownerData.email || null,
        address: ownerData.address,
        city: ownerData.city,
        property_title: ownerData.propertyTitle,
        property_title_details: ownerData.propertyTitleDetails || null,
        marital_status: ownerData.maritalStatus,
        spouse_name: ownerData.spouseName || null,
        spouse_phone: ownerData.spousePhone || null,
        children_count: ownerData.childrenCount,
      };
      
      await createOwner(ownerPayload);
      
    } catch (error) {
      console.error('Erreur création propriétaire:', error);
      alert('Erreur lors de la création');
    }
  };

  const handleDeleteOwner = async (ownerId: string) => {
    if (confirm('Supprimer ce propriétaire ?')) {
      try {
        await deleteOwner(ownerId);
      } catch (error) {
        console.error('Erreur suppression:', error);
      }
    }
  };

  const getPropertyTitleLabel = (title: string) => {
    const labels = {
      attestation_villageoise: 'Attestation villageoise',
      lettre_attribution: 'Lettre d\'attribution',
      permis_habiter: 'Permis d\'habiter',
      acd: 'ACD',
      tf: 'TF',
      cpf: 'CPF',
      autres: 'Autres'
    };
    return labels[title as keyof typeof labels] || title;
  };

  const getMaritalStatusLabel = (status: string) => {
    const labels = {
      celibataire: 'Célibataire',
      marie: 'Marié(e)',
      divorce: 'Divorcé(e)',
      veuf: 'Veuf/Veuve'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPropertyTitleColor = (title: string) => {
    switch (title) {
      case 'tf':
      case 'cpf':
        return 'success';
      case 'acd':
      case 'lettre_attribution':
        return 'info';
      case 'permis_habiter':
        return 'warning';
      case 'attestation_villageoise':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getMaritalStatusColor = (status: string) => {
    switch (status) {
      case 'marie': return 'success';
      case 'celibataire': return 'info';
      case 'divorce': return 'warning';
      case 'veuf': return 'secondary';
      default: return 'secondary';
    }
  };

  const filteredOwners = owners.filter(owner => {
    const matchesSearch = 
      owner.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.phone.includes(searchTerm) ||
      owner.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMaritalStatus = filterMaritalStatus === 'all' || owner.maritalStatus === filterMaritalStatus;
    const matchesPropertyTitle = filterPropertyTitle === 'all' || owner.propertyTitle === filterPropertyTitle;
    
    return matchesSearch && matchesMaritalStatus && matchesPropertyTitle;
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
          <h1 className="text-2xl font-bold text-gray-900">Propriétaires</h1>
          <p className="text-gray-600 mt-1">
            Gestion des propriétaires ({owners.length})
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un propriétaire
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
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filterMaritalStatus}
            onChange={(e) => setFilterMaritalStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes situations</option>
            <option value="celibataire">Célibataire</option>
            <option value="marie">Marié(e)</option>
            <option value="divorce">Divorcé(e)</option>
            <option value="veuf">Veuf/Veuve</option>
          </select>
          
          <select
            value={filterPropertyTitle}
            onChange={(e) => setFilterPropertyTitle(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les titres</option>
            <option value="tf">TF</option>
            <option value="cpf">CPF</option>
            <option value="acd">ACD</option>
            <option value="lettre_attribution">Lettre d'attribution</option>
            <option value="permis_habiter">Permis d'habiter</option>
            <option value="attestation_villageoise">Attestation villageoise</option>
            <option value="autres">Autres</option>
          </select>
        </div>
      </Card>

      {/* Owners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOwners.map((owner) => (
          <Card key={owner.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {owner.firstName[0]}{owner.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {owner.firstName} {owner.lastName}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-3 w-3 mr-1" />
                      <span>{owner.phone}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedOwner(owner);
                      setShowDetailsModal(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedOwner(owner);
                      setShowFinancialStatements(true);
                    }}
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteOwner(owner.id)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 text-green-600" />
                  <span>{owner.address}, {owner.city}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Titre:</span>
                  <Badge variant={getPropertyTitleColor(owner.propertyTitle)} size="sm">
                    {getPropertyTitleLabel(owner.propertyTitle)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Situation:</span>
                  <Badge variant={getMaritalStatusColor(owner.maritalStatus)} size="sm">
                    {getMaritalStatusLabel(owner.maritalStatus)}
                  </Badge>
                </div>

                {owner.maritalStatus === 'marie' && owner.spouseName && (
                  <div className="text-sm text-gray-600 bg-pink-50 p-2 rounded">
                    <p><strong>Conjoint:</strong> {owner.spouseName}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Enfants:</span>
                  <span className="font-medium text-gray-900">{owner.childrenCount}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Ajouté le {new Date(owner.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredOwners.length === 0 && (
        <div className="text-center py-12">
          <Plus className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun propriétaire
          </h3>
          <p className="text-gray-600 mb-4">
            Commencez par ajouter votre premier propriétaire.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un propriétaire
          </Button>
        </div>
      )}

      <OwnerForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAddOwner}
      />

      <OwnerDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOwner(null);
        }}
        owner={selectedOwner}
        onUpdate={() => refetch()}
      />

      {selectedOwner && (
        <Modal
          isOpen={showFinancialStatements}
          onClose={() => {
            setShowFinancialStatements(false);
            setSelectedOwner(null);
          }}
          title="État financier"
          size="xl"
        >
          <FinancialStatements
            entityId={selectedOwner.id}
            entityType="owner"
            entityName={`${selectedOwner.firstName} ${selectedOwner.lastName}`}
          />
        </Modal>
      )}
    </div>
  );
};