import React, { useState } from 'react';
import { Edit, Phone, MapPin, Heart, Calendar, MessageSquare } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Owner, Message, Notification } from '../../types/db';
import { OwnerForm } from './OwnerForm';
import { useAuth } from '../../contexts/AuthContext';
import { dbService, supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

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
  onUpdate,
}) => {
  const { user } = useAuth();
  const [showEditForm, setShowEditForm] = useState(false);

  if (!owner) return null;

  const getPropertyTitleLabel = (title: string) => {
    const labels: Record<Owner['property_title'], string> = {
      attestation_villageoise: 'Attestation villageoise',
      lettre_attribution: "Lettre d'attribution",
      permis_habiter: "Permis d'habiter",
      acd: 'ACD',
      tf: 'TF',
      cpf: 'CPF',
      autres: 'Autres',
    };
    return labels[title as Owner['property_title']] || title;
  };

  const getMaritalStatusLabel = (status: string) => {
    const labels: Record<Owner['marital_status'], string> = {
      celibataire: 'Célibataire',
      marie: 'Marié(e)',
      divorce: 'Divorcé(e)',
      veuf: 'Veuf/Veuve',
    };
    return labels[status as Owner['marital_status']] || status;
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

  const handleContact = async () => {
    if (!user?.id || !owner.agency_id) {
      toast.error('Utilisateur non authentifié ou agence non trouvée');
      return;
    }

    try {
      // Fetch agency_id for the current user to verify permissions
      const { data: agencyUser, error: agencyUserError } = await supabase
        .from('agency_users')
        .select('agency_id')
        .eq('user_id', user.id)
        .single();

      if (agencyUserError || !agencyUser) {
        throw new Error('Utilisateur non associé à une agence');
      }

      const { data: agencyDirector, error: directorError } = await supabase
        .from('agency_users')
        .select('user_id')
        .eq('agency_id', owner.agency_id)
        .eq('role', 'director')
        .single();

      if (directorError || !agencyDirector) {
        throw new Error('Directeur de l\'agence introuvable');
      }

      const message: Partial<Message> = {
        sender_id: user.id,
        receiver_id: agencyDirector.user_id,
        agency_id: owner.agency_id,
        subject: `Demande de collaboration pour ${owner.first_name} ${owner.last_name}`,
        content: `Bonjour, je suis intéressé par une collaboration concernant le propriétaire ${owner.first_name} ${owner.last_name}. Merci de me contacter pour discuter.`,
        is_read: false,
        created_at: new Date().toISOString(),
        attachments: [],
      };

      await dbService.messages.create(message);

      const notification: Partial<Notification> = {
        user_id: agencyDirector.user_id,
        type: 'new_message' as 'new_message',
        title: 'Nouveau message concernant un propriétaire',
        message: `Une agence vous a envoyé un message à propos de ${owner.first_name} ${owner.last_name}.`,
        priority: 'medium' as 'medium',
        data: { owner_id: owner.id },
        is_read: false,
        created_at: new Date().toISOString(),
      };

      await dbService.notifications.create(notification);

      toast.success('Message envoyé à l\'agence !');
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi du message:', err);
      toast.error(err.message || 'Erreur lors de l\'envoi du message');
    }
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleUpdate = async (updatedOwner: Owner) => {
    try {
      const result = await dbService.owners.update(owner.id, {
        first_name: updatedOwner.first_name,
        last_name: updatedOwner.last_name,
        phone: updatedOwner.phone,
        email: updatedOwner.email || null,
        address: updatedOwner.address,
        city: updatedOwner.city,
        property_title: updatedOwner.property_title,
        property_title_details: updatedOwner.property_title_details || null,
        marital_status: updatedOwner.marital_status,
        spouse_name: updatedOwner.spouse_name || null,
        spouse_phone: updatedOwner.spouse_phone || null,
        children_count: updatedOwner.children_count,
        updated_at: new Date().toISOString(),
      });

      onUpdate(result);
      setShowEditForm(false);
      toast.success(`Propriétaire ${result.first_name} ${result.last_name} mis à jour avec succès !`);
    } catch (err: any) {
      console.error('Erreur mise à jour propriétaire:', err);
      if (err.message.includes('row-level security')) {
        toast.error('Vous n’avez pas les permissions nécessaires pour modifier ce propriétaire.');
      } else {
        toast.error(err.message || 'Erreur lors de la mise à jour du propriétaire');
      }
    }
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
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button variant="ghost" onClick={handleContact}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Contacter
              </Button>
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-green-200">
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

          {/* Family Information */}
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
                        <Heart className="h-4 w-4 mr-2 text-pink-600" />
                        <span className="font-medium">Informations du conjoint</span>
                      </div>
                      <p><strong>Nom:</strong> {owner.spouse_name}</p>
                      {owner.spouse_phone && (
                        <p><strong>Téléphone:</strong> {owner.spouse_phone}</p>
                      )}
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

          {/* System Information */}
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
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Créé le {new Date(owner.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p>Modifié le {new Date(owner.updated_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Modal>

      {/* Edit Form Modal */}
      <OwnerForm
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          onClose();
        }}
        initialData={owner} // Pass the owner object directly, compatible with Owner | null | undefined
      />
    </>
  );
};