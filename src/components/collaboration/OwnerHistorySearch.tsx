import React, { useState, useEffect } from 'react';
import { Search, Users, Phone, MapPin, FileText, Building2, AlertTriangle, MessageSquare } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Owner, Message, Notification } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { dbService } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface OwnerHistory extends Owner {
  agency_name: string;
  properties_count: number;
}

export const OwnerHistorySearch: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [owners, setOwners] = useState<OwnerHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<OwnerHistory | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgency = async () => {
      if (!user?.id) {
        setError('Utilisateur non authentifié');
        return;
      }
      try {
        const { data, error } = await supabase
          .from('agency_users')
          .select('agency_id')
          .eq('user_id', user.id)
          .single();
        if (error) throw new Error(`❌ agency_users.select | ${error.message}`);
        setAgencyId(data?.agency_id ?? null);
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la récupération de l\'agence');
        toast.error(err.message || 'Erreur lors de la récupération de l\'agence');
      }
    };
    fetchAgency();
  }, [user?.id]);

  const searchOwners = async () => {
    if (!searchTerm.trim() || !agencyId) {
      toast.error('Veuillez entrer un terme de recherche et être associé à une agence');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('owners')
        .select(`
          *,
          agencies!inner(name),
          properties_count:properties(count)
        `)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .eq('agencies.is_active', true)
        .neq('agency_id', agencyId)
        .order('last_name', { ascending: true });

      if (error) throw new Error(`❌ owners.select | ${error.message}`);

      const formattedData: OwnerHistory[] = data?.map((owner) => ({
        ...owner,
        agency_name: owner.agencies.name,
        properties_count: owner.properties_count[0]?.count ?? 0,
      })) ?? [];

      setOwners(formattedData);
    } catch (err: any) {
      console.error('Erreur lors de la recherche:', err);
      setError(err.message || 'Erreur lors de la recherche des propriétaires');
      toast.error(err.message || 'Erreur lors de la recherche des propriétaires');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (owner: OwnerHistory) => {
    if (!user?.id || !agencyId) {
      toast.error('Utilisateur non authentifié ou agence non trouvée');
      return;
    }

    try {
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
        message: `L'agence ${agencyId} vous a envoyé un message à propos de ${owner.first_name} ${owner.last_name}.`,
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
    const labels = {
      attestation_villageoise: 'Attestation villageoise',
      lettre_attribution: 'Lettre d\'attribution',
      permis_habiter: 'Permis d\'habiter',
      acd: 'ACD',
      tf: 'TF',
      cpf: 'CPF',
      autres: 'Autres',
    };
    return labels[title as keyof typeof labels] || title;
  };

  const getMaritalStatusLabel = (status: string) => {
    const labels = {
      celibataire: 'Célibataire',
      marie: 'Marié(e)',
      divorce: 'Divorcé(e)',
      veuf: 'Veuf/Veuve',
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

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-600">{error}</p>
      </Card>
    );
  }

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
                <Input
                  type="text"
                  placeholder="Rechercher par nom, téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchOwners()}
                />
              </div>
            </div>

            <Button onClick={searchOwners} disabled={loading || !searchTerm.trim() || !agencyId}>
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
                  Les détails financiers sont confidentiels.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}

      {!loading && owners.length > 0 && (
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
                        <span>{owner.agency_name}</span>
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

                    <div className="text-xs text-gray-500">
                      <p>{owner.properties_count} bien(s) dans l'historique</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 flex space-x-2">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleContact(owner)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Contacter
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && owners.length === 0 && searchTerm && (
        <Card className="p-8 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun propriétaire trouvé
          </h3>
          <p className="text-gray-600 mb-4">
            Aucun propriétaire ne correspond à vos critères de recherche.
          </p>
        </Card>
      )}

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
                <p className="text-gray-600">Géré par {selectedOwner.agency_name}</p>
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
                      {selectedOwner.spouse_phone && (
                        <p><strong>Téléphone:</strong> {selectedOwner.spouse_phone}</p>
                      )}
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