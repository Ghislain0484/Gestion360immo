import React, { useState } from 'react';
import { Edit, Phone, MapPin, Heart, Calendar, MessageSquare } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Owner } from '../../types/db';
import { OwnerForm } from './OwnerForm';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { getPropertyTitleLabel, getMaritalStatusLabel, getPropertyTitleColor, getMaritalStatusColor } from '../../utils/ownerUtils';
import { sendContactMessage } from '../../utils/contactUtils';

interface OwnerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  owner: Owner | null;
  onUpdate: () => void;
}

export const OwnerDetailsModal: React.FC<OwnerDetailsModalProps> = ({
  isOpen,
  onClose,
  owner,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [showEditForm, setShowEditForm] = useState(false);

  if (!owner) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Erreur">
        <p className="text-center text-red-600">Propriétaire non trouvé</p>
      </Modal>
    );
  }

  const handleContact = async () => {
    if (!user?.id) {
      toast.error('Utilisateur non authentifié');
      return;
    }
    await sendContactMessage(user.id, owner, 'owner', owner.id, `${owner.first_name} ${owner.last_name}`);
  };

  const handleEdit = () => {
    if (!user?.role || !['admin', 'director'].includes(user.role)) {
      toast.error('Vous n’avez pas les permissions nécessaires pour modifier ce propriétaire.');
      return;
    }
    setShowEditForm(true);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Détails du propriétaire">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-xl">
                  {owner.first_name[0]}{owner.last_name[0]}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {owner.first_name} {owner.last_name}
                </h2>
                <p className="text-gray-600">{owner.phone}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleEdit} aria-label={`Modifier ${owner.first_name} ${owner.last_name}`}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button variant="ghost" onClick={handleContact} aria-label={`Contacter l'agence pour ${owner.first_name} ${owner.last_name}`}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Contacter
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-green-200">
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Informations personnelles</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-blue-600" aria-label="Icône téléphone" />
                    <span>{owner.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2">{owner.email || 'Non spécifié'}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-green-600" aria-label="Icône localisation" />
                    <span>{owner.address}, {owner.city}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Titre de propriété</h3>
                <div className="space-y-2">
                  <Badge variant={getPropertyTitleColor(owner.property_title)} size="md">
                    {getPropertyTitleLabel(owner.property_title)}
                  </Badge>
                  {owner.property_title_details && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Détails:</strong> {owner.property_title_details}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Situation familiale</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Badge variant={getMaritalStatusColor(owner.marital_status)} size="sm">
                    {getMaritalStatusLabel(owner.marital_status)}
                  </Badge>
                  {owner.marital_status === 'marie' && owner.spouse_name && (
                    <div className="mt-3 p-3 bg-pink-50/80 rounded-lg text-sm">
                      <div className="flex items-center mb-2">
                        <Heart className="h-4 w-4 mr-2 text-pink-600" aria-label="Icône conjoint" />
                        <span className="font-medium">Informations du conjoint</span>
                      </div>
                      <p><strong>Nom:</strong> {owner.spouse_name}</p>
                      <p><strong>Téléphone:</strong> {owner.spouse_phone || 'Non spécifié'}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Nombre d'enfants:</strong> {owner.children_count}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Informations système</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p><strong>ID Propriétaire:</strong> {owner.id}</p>
                  <p><strong>ID Agence:</strong> {owner.agency_id}</p>
                </div>
                <div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" aria-label="Icône date" />
                    <span>Créé le {new Date(owner.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p>Modifié le {new Date(owner.updated_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Modal>

      <OwnerForm
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          onClose();
        }}
        initialData={owner}
        onSuccess={onUpdate}
      />
    </>
  );
};