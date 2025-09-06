import React, { useState } from 'react';
import { Plus, Search, MapPin, Phone, Trash2, Eye, DollarSign, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Owner, Message, Notification } from '../../types/db';
import { OwnerForm } from './OwnerForm';
import { FinancialStatements } from '../financial/FinancialStatements';
import { OwnerDetailsModal } from './OwnerDetailsModal';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService, supabase } from '../../lib/supabase'; // Import supabase directly
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const OwnersList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaritalStatus, setFilterMaritalStatus] = useState('all');
  const [filterPropertyTitle, setFilterPropertyTitle] = useState('all');

  const { data: owners, loading, error, refetch, setData } = useRealtimeData<Owner>(
    dbService.owners.getAll,
    'owners'
  );

  const handleDeleteOwner = async (ownerId: string) => {
    if (!confirm('Supprimer ce propriétaire ?')) return;

    try {
      await dbService.owners.delete(ownerId);
      toast.success('Propriétaire supprimé avec succès !');
      refetch();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      if (error.message.includes('row-level security')) {
        toast.error('Vous n’avez pas les permissions nécessaires pour supprimer ce propriétaire.');
      } else {
        toast.error(error.message || 'Erreur lors de la suppression');
      }
    }
  };

  const handleContact = async (owner: Owner) => {
    if (!user?.id) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    try {
      const { data: agencyDirector, error: directorError } = await supabase // Use supabase directly
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

  const filteredOwners = owners.filter((owner) => {
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
        <Button onClick={refetch}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propriétaires</h1>
          <p className="text-gray-600 mt-1">Gestion des propriétaires ({owners.length})</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un propriétaire
        </Button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 p-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
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
                    onClick={() => handleContact(owner)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteOwner(owner.id)}
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

      {filteredOwners.length === 0 && (
        <div className="text-center py-12">
          <Plus className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun propriétaire</h3>
          <p className="text-gray-600 mb-4">Commencez par ajouter votre premier propriétaire.</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un propriétaire
          </Button>
        </div>
      )}

      <OwnerForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedOwner(null);
        }}
        initialData={selectedOwner}
      />

      <OwnerDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOwner(null);
        }}
        owner={selectedOwner}
        onUpdate={(updatedOwner) => {
          setData((prev) => prev.map((o) => (o.id === updatedOwner.id ? updatedOwner : o)));
          setShowDetailsModal(false);
          setSelectedOwner(null);
        }}
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