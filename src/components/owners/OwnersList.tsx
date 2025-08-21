import React, { useState } from 'react';
import { Plus, Search, Filter, MapPin, Phone, FileText, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { OwnerForm } from './OwnerForm';
import { Owner, OwnerFormData } from '../../types/owner';
import { useRealtimeData, useSupabaseCreate, useSupabaseDelete } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FinancialStatements } from '../financial/FinancialStatements';
import { Modal } from '../ui/Modal';
import { DollarSign } from 'lucide-react';

import { OwnerDetailsModal } from './OwnerDetailsModal';

export const OwnersList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaritalStatus, setFilterMaritalStatus] = useState('all');
  const [filterPropertyTitle, setFilterPropertyTitle] = useState('all');
  const [formLoading, setFormLoading] = useState(false);
  
  // Liste propriétaires (temps réel)
const {
  data: owners = [],
  loading: listLoading,
  error: listError,
  reload,
} = useRealtimeData<Owner>(dbService.getOwners, 'owners');

// Création propriétaire
const { create, loading: createLoading } = useSupabaseCreate();
const onSubmit = async (formValues: any) => {
  try {
    // mappe clairement le payload attendu côté DB
    const payload = {
      firstName:  formValues.firstName,
      lastName:   formValues.lastName,
      phone:      formValues.phone || null,
      email:      formValues.email || null,
      city:       formValues.city || null,
      // ajoute d’autres champs si présents dans ta table
    };
    console.log('📝 onSubmit owners payload:', payload);
    await create('owners', payload);             // <<< IMPORTANT
    // ensuite: toast succès + reload
  } catch (e: any) {
    console.error('💥 Owners onSubmit failed:', e?.message || e);
    // toast/alert
  }
};


  const { deleteItem: deleteOwner, loading: deleting } = useSupabaseDelete(
    dbService.deleteOwner,
    () => reload()
  );

  const handleAddOwner = async (ownerData: OwnerFormData) => {
    if (!user?.agencyId) {
      alert('❌ Aucune agence associée à votre compte. Veuillez vous reconnecter.');
      return;
    }
    
    try {
      // Validation des données avant envoi
      if (!ownerData.firstName || !ownerData.lastName || !ownerData.phone) {
        alert('Veuillez remplir tous les champs obligatoires (prénom, nom, téléphone)');
        return;
      }
      
      // Validation du téléphone
      const phoneRegex = /^(\+225)?[0-9\s-]{8,15}$/;
      if (!phoneRegex.test(ownerData.phone)) {
        alert('Format de téléphone invalide. Utilisez: +225 XX XX XX XX XX');
        return;
      }
      
      // Validation email si fourni
      if (ownerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerData.email)) {
        alert('Format d\'email invalide');
        return;
      }
      
      // Validation des données du conjoint si marié
      if (ownerData.maritalStatus === 'marie') {
        if (!ownerData.spouseName?.trim() || !ownerData.spousePhone?.trim()) {
          alert('Informations du conjoint obligatoires pour une personne mariée');
          return;
        }
        if (!phoneRegex.test(ownerData.spousePhone)) {
          alert('Format de téléphone du conjoint invalide');
          return;
        }
      }
      
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
      console.error('Error creating owner:', error);
      alert('Erreur lors de la création du propriétaire. Veuillez réessayer.');
    }
  };

  const handleDeleteOwner = async (ownerId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce propriétaire ?')) {
      try {
        await deleteOwner(ownerId);
      } catch (error) {
        console.error('Error deleting owner:', error);
      }
    }
  };

  const handleViewOwner = (owner: Owner) => {
    setSelectedOwner(owner);
    setShowDetailsModal(true);
  };

  const handleEditOwner = (owner: Owner) => {
    setSelectedOwner(owner);
    setShowDetailsModal(true);
  };

  const handleUpdateOwner = async (ownerData: OwnerFormData) => {
    if (!selectedOwner) return;
    
    try {
      await dbService.updateOwner(selectedOwner.id, {
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
      });
      
      setShowEditModal(false);
      setSelectedOwner(null);
      reload();
      alert('Propriétaire mis à jour avec succès !');
    } catch (error) {
      console.error('Error updating owner:', error);
      alert('Erreur lors de la mise à jour du propriétaire.');
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
      case 'marie':
        return 'success';
      case 'celibataire':
        return 'info';
      case 'divorce':
        return 'warning';
      case 'veuf':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const filteredOwners = owners.filter(owner => {
    const matchesSearch = 
      owner.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.phone.includes(searchTerm) ||
      owner.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMaritalStatus = filterMaritalStatus === 'all' || owner.marital_status === filterMaritalStatus;
    const matchesPropertyTitle = filterPropertyTitle === 'all' || owner.property_title === filterPropertyTitle;
    
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
        <Button onClick={reload}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propriétaires</h1>
          <p className="text-gray-600 mt-1">
            Gestion des propriétaires de biens immobiliers
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Ajouter un propriétaire</span>
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
                placeholder="Rechercher par nom, téléphone ou ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
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
                      {owner.first_name[0]}{owner.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {owner.first_name} {owner.last_name}
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
                    onClick={() => handleViewOwner(owner)}
                    title="Voir les détails"
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
                    title="État financier"
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditOwner(owner)}
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4" />
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
                  <div className="flex items-center text-sm">
                    <FileText className="h-4 w-4 mr-2 text-orange-600" />
                    <span className="text-gray-600">Titre:</span>
                  </div>
                  <Badge variant={getPropertyTitleColor(owner.property_title)} size="sm">
                    {getPropertyTitleLabel(owner.property_title)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Situation:</span>
                  <Badge variant={getMaritalStatusColor(owner.marital_status)} size="sm">
                    {getMaritalStatusLabel(owner.marital_status)}
                  </Badge>
                </div>

                {owner.marital_status === 'marie' && owner.spouse_name && (
                  <div className="text-sm text-gray-600 bg-pink-50 p-2 rounded">
                    <p><strong>Conjoint:</strong> {owner.spouse_name}</p>
                    <p><strong>Tél:</strong> {owner.spouse_phone}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Enfants:</span>
                  <span className="font-medium text-gray-900">{owner.children_count}</span>
                </div>

                {owner.email && (
                  <div className="text-sm text-gray-600">
                    <strong>Email:</strong> {owner.email}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Ajouté le {new Date(owner.created_at).toLocaleDateString('fr-FR')}</span>
                  <span>ID: {owner.id}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredOwners.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Plus className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun propriétaire trouvé
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterMaritalStatus !== 'all' || filterPropertyTitle !== 'all'
              ? 'Aucun propriétaire ne correspond à vos critères de recherche.'
              : 'Commencez par ajouter votre premier propriétaire.'}
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
        onUpdate={handleUpdateOwner}
      />

      {/* Edit Owner Modal */}
      <OwnerForm
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedOwner(null);
        }}
        onSubmit={handleUpdateOwner}
        initialData={selectedOwner ? {
          firstName: selectedOwner.first_name,
          lastName: selectedOwner.last_name,
          phone: selectedOwner.phone,
          email: selectedOwner.email || '',
          address: selectedOwner.address,
          city: selectedOwner.city,
          propertyTitle: selectedOwner.property_title,
          propertyTitleDetails: selectedOwner.property_title_details || '',
          maritalStatus: selectedOwner.marital_status,
          spouseName: selectedOwner.spouse_name || '',
          spousePhone: selectedOwner.spouse_phone || '',
          childrenCount: selectedOwner.children_count,
          agencyId: selectedOwner.agency_id,
        } : undefined}
      />

      {selectedOwner && (
        <Modal
          isOpen={showFinancialStatements}
          onClose={() => {
            setShowFinancialStatements(false);
            setSelectedOwner(null);
          }}
          title="État financier du propriétaire"
          size="xl"
        >
          <FinancialStatements
            entityId={selectedOwner.id}
            entityType="owner"
            entityName={`${selectedOwner.first_name} ${selectedOwner.last_name}`}
          />
        </Modal>
      )}
    </div>
  );
};