import React, { useState } from 'react';
import { Eye, Edit, X, Phone, MapPin, FileText, Heart, Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Owner } from '../../types/owner';
import { OwnerForm } from './OwnerForm';

interface OwnerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  owner: Owner | null;
  onUpdate: (owner: Owner) => void;
}

export const OwnerDetailsModal: React.FC<OwnerDetailsModalProps> = ({
  isOpen,
  onClose,
  owner,
  onUpdate
}) => {
  const [showEditForm, setShowEditForm] = useState(false);

  if (!owner) return null;

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

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleUpdate = (updatedData: any) => {
    onUpdate(updatedData);
    setShowEditForm(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Détails du propriétaire">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-xl">
                  {owner.firstName[0]}{owner.lastName[0]}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {owner.firstName} {owner.lastName}
                </h2>
                <p className="text-gray-600">{owner.phone}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Informations personnelles</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-blue-600" />
                    <span>{owner.phone}</span>
                  </div>
                  {owner.email && (
                    <div className="flex items-center">
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2">{owner.email}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-green-600" />
                    <span>{owner.address}, {owner.city}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Titre de propriété</h3>
                <div className="space-y-2">
                  <Badge variant={getPropertyTitleColor(owner.propertyTitle)} size="md">
                    {getPropertyTitleLabel(owner.propertyTitle)}
                  </Badge>
                  {owner.propertyTitleDetails && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Détails:</strong> {owner.propertyTitleDetails}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Family Information */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Situation familiale</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Badge variant={getMaritalStatusColor(owner.maritalStatus)} size="sm">
                    {getMaritalStatusLabel(owner.maritalStatus)}
                  </Badge>
                  {owner.maritalStatus === 'marie' && owner.spouseName && (
                    <div className="mt-3 p-3 bg-pink-50 rounded-lg text-sm">
                      <div className="flex items-center mb-2">
                        <Heart className="h-4 w-4 mr-2 text-pink-600" />
                        <span className="font-medium">Informations du conjoint</span>
                      </div>
                      <p><strong>Nom:</strong> {owner.spouseName}</p>
                      <p><strong>Téléphone:</strong> {owner.spousePhone}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Nombre d'enfants:</strong> {owner.childrenCount}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* System Information */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Informations système</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p><strong>ID Propriétaire:</strong> {owner.id}</p>
                  <p><strong>ID Agence:</strong> {owner.agencyId}</p>
                </div>
                <div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Créé le {new Date(owner.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p>Modifié le {new Date(owner.updatedAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Modal>

      {/* Edit Form Modal */}
      <OwnerForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleUpdate}
        initialData={{
          firstName: owner.firstName,
          lastName: owner.lastName,
          phone: owner.phone,
          email: owner.email || '',
          address: owner.address,
          city: owner.city,
          propertyTitle: owner.propertyTitle,
          propertyTitleDetails: owner.propertyTitleDetails || '',
          maritalStatus: owner.maritalStatus,
          spouseName: owner.spouseName || '',
          spousePhone: owner.spousePhone || '',
          childrenCount: owner.childrenCount,
          agencyId: owner.agencyId,
        }}
      />
    </>
  );
};