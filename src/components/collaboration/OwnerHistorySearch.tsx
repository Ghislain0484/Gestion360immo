import React, { useState } from 'react';
import { Search, Users, Phone, MapPin, FileText, Building2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { dbService } from '../../lib/supabase';

interface OwnerHistory {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  property_title: string;
  property_title_details?: string;
  marital_status: string;
  spouse_name?: string;
  spouse_phone?: string;
  children_count: number;
  agencies: { name: string };
  properties: { count: number };
}

export const OwnerHistorySearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [owners, setOwners] = useState<OwnerHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerHistory | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const searchOwners = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const results = await dbService.searchOwnersHistory(searchTerm);
      setOwners(results || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Recherche d'historique des propriétaires
            </h3>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchOwners()}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <Button onClick={searchOwners} disabled={loading || !searchTerm.trim()}>
              {loading ? 'Recherche...' : 'Rechercher'}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">
                  Recherche collaborative de propriétaires
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  Consultez l'historique des propriétaires ayant travaillé avec d'autres agences de la plateforme. 
                  Informations sur les titres de propriété, situation familiale et expérience collaborative.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      {owners.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Résultats de recherche ({owners.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {owners.map((owner) => (
              <Card key={owner.id} className="hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-sm">
                        {owner.first_name[0]}{owner.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {owner.first_name} {owner.last_name}
                      </h5>
                      <div className="flex items-center text-xs text-gray-500">
                        <Building2 className="h-3 w-3 mr-1" />
                        <span>{owner.agencies.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-3 w-3 mr-2" />
                      <span>{owner.phone}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-3 w-3 mr-2" />
                      <span>{owner.address}, {owner.city}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Titre de propriété:</span>
                      <Badge variant={getPropertyTitleColor(owner.property_title)} size="sm">
                        {getPropertyTitleLabel(owner.property_title)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Situation:</span>
                      <Badge variant={getMaritalStatusColor(owner.marital_status)} size="sm">
                        {getMaritalStatusLabel(owner.marital_status)}
                      </Badge>
                    </div>

                    {owner.properties && (
                      <div className="text-xs text-gray-500">
                        <p>{owner.properties.count || 0} bien(s) dans l'historique</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedOwner(owner);
                        setShowDetails(true);
                      }}
                    >
                      Voir les détails
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Owner Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedOwner(null);
        }}
        title="Détails du propriétaire"
        size="lg"
      >
        {selectedOwner && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-xl">
                  {selectedOwner.first_name[0]}{selectedOwner.last_name[0]}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedOwner.first_name} {selectedOwner.last_name}
                </h3>
                <p className="text-gray-600">Géré par {selectedOwner.agencies.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informations personnelles</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Téléphone:</strong> {selectedOwner.phone}</p>
                  {selectedOwner.email && <p><strong>Email:</strong> {selectedOwner.email}</p>}
                  <p><strong>Adresse:</strong> {selectedOwner.address}, {selectedOwner.city}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Titre de propriété</h4>
                <div className="space-y-2">
                  <Badge variant={getPropertyTitleColor(selectedOwner.property_title)} size="md">
                    {getPropertyTitleLabel(selectedOwner.property_title)}
                  </Badge>
                  {selectedOwner.property_title_details && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Détails:</strong> {selectedOwner.property_title_details}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Situation familiale</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Badge variant={getMaritalStatusColor(selectedOwner.marital_status)} size="sm">
                    {getMaritalStatusLabel(selectedOwner.marital_status)}
                  </Badge>
                  {selectedOwner.marital_status === 'marie' && selectedOwner.spouse_name && (
                    <div className="mt-2 p-3 bg-pink-50 rounded-lg text-sm">
                      <p><strong>Conjoint:</strong> {selectedOwner.spouse_name}</p>
                      <p><strong>Téléphone:</strong> {selectedOwner.spouse_phone}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Nombre d'enfants:</strong> {selectedOwner.children_count}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <FileText className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Informations partagées
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Ces informations sont partagées dans le cadre de la collaboration inter-agences pour faciliter 
                    l'évaluation des profils de propriétaires. Les détails financiers restent confidentiels.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};