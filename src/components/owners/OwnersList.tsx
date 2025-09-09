import React, { useState, useMemo } from 'react';
import { Plus, Search, MapPin, Phone, Trash2, Eye, DollarSign, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Owner } from '../../types/db';
import { OwnerForm } from './OwnerForm';
import { OwnerDetailsModal } from './OwnerDetailsModal';
import { FinancialStatements } from '../financial/FinancialStatements';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';
import { validate as uuidValidate } from 'uuid';
import {
  getPropertyTitleLabel,
  getMaritalStatusLabel,
  getPropertyTitleColor,
  getMaritalStatusColor,
} from '../../utils/ownerUtils';
import { sendContactMessage } from '../../utils/contactUtils';

export const OwnersList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaritalStatus, setFilterMaritalStatus] = useState('all');
  const [filterPropertyTitle, setFilterPropertyTitle] = useState('all');

  const { data: owners, loading, error, refetch } = useRealtimeData<Owner>(
    dbService.owners.getAll,
    'owners'
  );

  const debouncedSetSearchTerm = debounce((value: string) => setSearchTerm(value), 300);

  const handleDeleteOwner = async (ownerId: string) => {
    if (!user?.role || !['admin', 'director'].includes(user.role)) {
      toast.error('Vous n’avez pas les permissions nécessaires pour supprimer un propriétaire.');
      return;
    }
    if (!uuidValidate(ownerId)) {
      toast.error('ID de propriétaire invalide');
      return;
    }
    if (!confirm('Supprimer ce propriétaire ?')) return;

    try {
      await dbService.owners.delete(ownerId);
      toast.success('Propriétaire supprimé avec succès !');
      refetch();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast.error(
        error.message.includes('row-level security')
          ? 'Vous n’avez pas les permissions nécessaires pour supprimer ce propriétaire.'
          : error.message || 'Erreur lors de la suppression'
      );
    }
  };

  const handleContact = async (owner: Owner) => {
    if (!user?.id) {
      toast.error('Utilisateur non authentifié');
      return;
    }
    await sendContactMessage(
      user.id,
      owner,
      'owner',
      owner.id,
      `${owner.first_name} ${owner.last_name}`
    );
  };

  const filteredOwners = useMemo(() => {
    return owners.filter((owner) => {
      const matchesSearch =
        owner.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.phone.includes(searchTerm) ||
        owner.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMaritalStatus =
        filterMaritalStatus === 'all' || owner.marital_status === filterMaritalStatus;

      const matchesPropertyTitle =
        filterPropertyTitle === 'all' || owner.property_title === filterPropertyTitle;

      return matchesSearch && matchesMaritalStatus && matchesPropertyTitle;
    });
  }, [owners, searchTerm, filterMaritalStatus, filterPropertyTitle]);

  return (
    <div className="space-y-6">
      {/* 🔹 En-tête toujours visible */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propriétaires</h1>
          <p className="text-gray-600 mt-1">Gestion des propriétaires ({owners.length})</p>
        </div>
        <Button onClick={() => setShowForm(true)} aria-label="Ajouter un propriétaire">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un propriétaire
        </Button>
      </div>

      {/* 🔹 Filtres responsives */}
      <Card className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 p-4">
          {/* 🔍 Recherche */}
          <div className="flex-1">
            <label htmlFor="search-input" className="sr-only">
              Rechercher un propriétaire
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search-input"
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <label
                htmlFor="marital-status-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Situation matrimoniale
              </label>
              <select
                id="marital-status-filter"
                value={filterMaritalStatus}
                onChange={(e) => setFilterMaritalStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="all">Toutes situations</option>
                <option value="celibataire">Célibataire</option>
                <option value="marie">Marié(e)</option>
                <option value="divorce">Divorcé(e)</option>
                <option value="veuf">Veuf/Veuve</option>
              </select>
            </div>

            <div className="flex-1 sm:flex-none">
              <label
                htmlFor="property-title-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Titre de propriété
              </label>
              <select
                id="property-title-filter"
                value={filterPropertyTitle}
                onChange={(e) => setFilterPropertyTitle(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="all">Tous les titres</option>
                <option value="tf">TF</option>
                <option value="cpf">CPF</option>
                <option value="acd">ACD</option>
                <option value="lettre_attribution">Lettre d&apos;attribution</option>
                <option value="permis_habiter">Permis d&apos;habiter</option>
                <option value="attestation_villageoise">Attestation villageoise</option>
                <option value="autres">Autres</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* 🔹 Zone de contenu dynamique */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Erreur: {error}</p>
          <Button onClick={refetch}>Réessayer</Button>
        </div>
      ) : filteredOwners.length === 0 ? (
        <div className="text-center py-12">
          <Plus className="h-16 w-16 mx-auto mb-4 text-gray-400" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun propriétaire</h3>
          <p className="text-gray-600 mb-4">
            Commencez par ajouter votre premier propriétaire.
          </p>
          <Button onClick={() => setShowForm(true)} aria-label="Ajouter un propriétaire">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un propriétaire
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOwners.map((owner) => (
            <Card key={owner.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {owner.first_name[0]}
                        {owner.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {owner.first_name} {owner.last_name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-3 w-3 mr-1" aria-hidden="true" />
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
                      aria-label={`Voir les détails de ${owner.first_name} ${owner.last_name}`}
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
                      aria-label={`Voir les états financiers de ${owner.first_name} ${owner.last_name}`}
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleContact(owner)}
                      aria-label={`Contacter l'agence pour ${owner.first_name} ${owner.last_name}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteOwner(owner.id)}
                      aria-label={`Supprimer ${owner.first_name} ${owner.last_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-green-600" aria-hidden="true" />
                    <span>
                      {owner.address}, {owner.city}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Titre:</span>
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
                      <p>
                        <strong>Conjoint:</strong> {owner.spouse_name}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Enfants:</span>
                    <span className="font-medium text-gray-900">{owner.children_count}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Ajouté le {new Date(owner.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 🔹 Modales */}
      <OwnerForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedOwner(null);
        }}
        initialData={selectedOwner}
        onSuccess={refetch}
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
            entityName={`${selectedOwner.first_name} ${selectedOwner.last_name}`}
          />
        </Modal>
      )}
    </div>
  );
};
