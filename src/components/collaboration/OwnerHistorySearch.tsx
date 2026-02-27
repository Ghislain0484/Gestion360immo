import React, { useState } from 'react';
import { Search, UserCheck, Phone, MapPin, Briefcase, Flag, AlertTriangle, CheckCircle, XCircle, Building2, MessageSquare, Shield, Users } from 'lucide-react';
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
  const { user, agencyId: authAgencyId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [owners, setOwners] = useState<OwnerHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);



  const searchOwners = async () => {
    if (!searchTerm.trim() || !authAgencyId) {
      toast.error('Veuillez entrer un email ou un numéro de téléphone');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('check_tier_reputation_v22', {
        p_search: searchTerm.trim(),
        p_type: 'owner'
      });

      if (error) throw error;
      setOwners(data || []);
    } catch (err: any) {
      console.error('Erreur lors de la recherche:', err);
      setError(err.message || 'Erreur lors de la recherche');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (result: any) => {
    if (!user?.id || !authAgencyId) {
      toast.error('Session expirée');
      return;
    }

    setRequestingAccess(true);
    try {
      const { error: reqError } = await supabase
        .from('collaboration_requests')
        .insert({
          requester_agency_id: authAgencyId,
          target_agency_id: result.agency_id,
          tier_id: result.id,
          tier_type: 'owner',
          status: 'pending'
        });

      if (reqError) throw reqError;

      const { data: director } = await supabase
        .from('agency_users')
        .select('user_id')
        .eq('agency_id', result.agency_id)
        .eq('role', 'director')
        .single();

      if (director) {
        await dbService.messages.create({
          sender_id: user.id,
          receiver_id: director.user_id,
          agency_id: result.agency_id,
          subject: `Demande d'informations : Propriétaire trouvé`,
          content: `Bonjour, nous avons trouvé un propriétaire (ID: ${result.id.slice(0, 8)}) ayant un historique dans votre agence. Pourriez-vous nous autoriser l'accès à son dossier ?`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }

      toast.success('Demande d\'accès envoyée !');
      setShowRequestModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRequestingAccess(false);
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

            <Button onClick={searchOwners} disabled={loading || !searchTerm.trim() || !authAgencyId}>
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
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {owner.redacted_name}
                      </h5>
                      <div className="flex items-center text-xs text-gray-500">
                        <Building2 className="h-3 w-3 mr-1" />
                        <span>Agence : {owner.agency_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Confiance :</span>
                      <Badge variant="info" size="sm">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4" />
                          <span>Vérifié par la plateforme</span>
                        </div>
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500">
                      <p>{owner.contract_count} propriété(s) gérée(s)</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedOwner(owner);
                        setShowRequestModal(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Demander l'accès au dossier
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