import React, { useState } from 'react';
import { Search, UserCheck, AlertTriangle, CheckCircle, XCircle, Building2, MessageSquare, Shield } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Tenant, Contract } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { dbService } from '../../lib/supabase';
import { FintechService } from '../../lib/db/fintechService';
import toast from 'react-hot-toast';

interface TenantHistory extends Tenant {
  agency_name: string;
  contracts: Array<Contract & { property_title: string }>;
  redacted_name: string;
  reputation_score: number;
  contract_count: number;
}

export const TenantHistorySearch: React.FC<{ onCreditUsed?: () => void }> = ({ onCreditUsed }) => {
  const { user, agencyId: authAgencyId } = useAuth();
  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    phone: '',
    idType: 'cni',
    idNumber: ''
  });
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'bon' | 'irregulier' | 'mauvais'>('all');
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  // Charger les demandes déjà faites par cette agence
  const fetchMyRequests = async () => {
    if (!authAgencyId) return;
    const { data } = await supabase
      .from('collaboration_requests')
      .select('*')
      .eq('requester_agency_id', authAgencyId);
    setMyRequests(data || []);
  };

  React.useEffect(() => {
    fetchMyRequests();
  }, [authAgencyId]);



  const searchTenants = async () => {
    if ((!formData.nom.trim() && !formData.phone.trim()) || !authAgencyId) {
      toast.error('Veuillez entrer au moins un nom ou un numéro de téléphone');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Charger les dernières demandes pour avoir les statuts à jour
      await fetchMyRequests();

      // 2. Utiliser le nouveau RPC V23 pour une recherche anonymisée précise
      const { data, error } = await supabase.rpc('check_tier_reputation_v23', {
        p_nom: formData.nom.trim(),
        p_prenoms: formData.prenoms.trim(),
        p_phone: formData.phone.trim(),
        p_id_number: formData.idNumber.trim()
      });

      if (error) throw error;
      setTenants(data || []);
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
      // 1. Débiter un crédit
      await FintechService.useCollaborationCredit(authAgencyId);

      // 2. Créer la demande formelle
      const { error: reqError } = await supabase
        .from('collaboration_requests')
        .insert({
          requester_agency_id: authAgencyId,
          target_agency_id: result.agency_id,
          tier_id: result.id,
          tier_type: 'tenant',
          requester_id: user.id,
          status: 'pending'
        });

      if (reqError) throw reqError;

      // 2. Notifier l'agence via la messagerie
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
          agency_id: authAgencyId,
          receiver_agency_id: result.agency_id,
          subject: `Demande d'informations : Locataire trouvé`,
          content: `Bonjour, nous avons trouvé un candidat (ID: ${result.id?.slice(0, 8) || 'N/A'}) ayant un historique dans votre agence. Pourriez-vous nous autoriser l'accès à son dossier complet ?`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }

      toast.success('Demande d\'accès envoyée avec succès !');
      setShowRequestModal(false);
      await fetchMyRequests(); // Rafraîchir
      onCreditUsed?.(); // ✅ Notifier le parent pour rafraîchir le wallet
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRequestingAccess(false);
    }
  };

  const loadFullTenantDetails = async (tenantId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          agency:agencies(name),
          contracts(*)
        `)
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      
      setSelectedTenant({
        ...data,
        agency_name: data.agency?.name
      });
      setShowDetails(true);
    } catch (err: any) {
      toast.error("Erreur lors de la récupération des détails : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'bon':
        return 'success';
      case 'irregulier':
        return 'warning';
      case 'mauvais':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'bon':
        return <CheckCircle className="h-4 w-4" />;
      case 'irregulier':
        return <AlertTriangle className="h-4 w-4" />;
      case 'mauvais':
        return <XCircle className="h-4 w-4" />;
      default:
        return <UserCheck className="h-4 w-4" />;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'bon':
        return 'Bon payeur';
      case 'irregulier':
        return 'Payeur irrégulier';
      case 'mauvais':
        return 'Mauvais payeur';
      default:
        return status;
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
            <UserCheck className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Recherche d'historique des locataires
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <Input
                type="text"
                placeholder="Nom de famille"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénoms</label>
              <Input
                type="text"
                placeholder="Prénoms"
                value={formData.prenoms}
                onChange={(e) => setFormData({ ...formData, prenoms: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
              <Input
                type="text"
                placeholder="Numéro de téléphone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de pièce</label>
              <select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cni">CNI</option>
                <option value="passport">Passeport</option>
                <option value="permis">Permis de conduire</option>
                <option value="consulaire">Carte consulaire</option>
                <option value="attestation">Attestation d'identité</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de pièce</label>
              <Input
                type="text"
                placeholder="N° de la pièce"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={searchTenants} 
                disabled={loading || (!formData.phone.trim() && !formData.nom.trim()) || !authAgencyId}
                className="w-full h-[42px]"
              >
                {loading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Collaboration inter-agences
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Cette recherche vous permet de consulter l'historique des locataires ayant été gérés par d'autres agences de la plateforme.
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

      {!loading && tenants.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Résultats de recherche ({tenants.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => (
              <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {tenant.redacted_name}
                      </h5>
                      <div className="flex items-center text-xs text-gray-500">
                        <Building2 className="h-3 w-3 mr-1" />
                        <span>Agence : {tenant.agency_name}</span>
                      </div>
                      {tenant.contract_period && (
                        <div className="flex items-center text-xs text-gray-500 mt-1 font-mono">
                           <span>Période : {tenant.contract_period}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Réputation :</span>
                      <Badge variant={getPaymentStatusColor(tenant.payment_status)} size="sm">
                        <div className="flex items-center space-x-1">
                          {getPaymentStatusIcon(tenant.payment_status)}
                          <span>{tenant.reputation_score}</span>
                        </div>
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500">
                      <p>{tenant.contract_count} contrat(s) passés/actifs</p>
                    </div>
                  </div>


                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {(() => {
                      const request = myRequests.find(r => r.tier_id === tenant.id);
                      if (request?.status === 'approved') {
                        return (
                          <Button
                            variant="success"
                            size="sm"
                            className="w-full"
                            onClick={() => loadFullTenantDetails(tenant.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Voir le dossier complet
                          </Button>
                        );
                      }
                      if (request?.status === 'pending') {
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full cursor-not-allowed opacity-70"
                            disabled
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Demande en attente...
                          </Button>
                        );
                      }
                      return (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setShowRequestModal(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Demander l'accès au dossier
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && tenants.length === 0 && (formData.nom || formData.phone) && (
        <Card className="p-8 text-center">
          <UserCheck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun locataire trouvé
          </h3>
          <p className="text-gray-600 mb-4">
            Aucun locataire ne correspond à vos critères de recherche.
          </p>
        </Card>
      )}

      <Modal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedTenant(null);
        }}
        title="Historique détaillé du locataire"
        size="lg"
      >
        {selectedTenant && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              {selectedTenant.photo_url ? (
                <img
                  src={selectedTenant.photo_url}
                  alt={`${selectedTenant.first_name} ${selectedTenant.last_name}`}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-xl">
                    {selectedTenant.first_name?.[0] || ''}{selectedTenant.last_name?.[0] || ''}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedTenant.first_name} {selectedTenant.last_name}
                </h3>
                <p className="text-gray-600">Géré par {selectedTenant.agency_name}</p>
                <Badge variant={getPaymentStatusColor(selectedTenant.payment_status)} size="sm" className="mt-1">
                  {getPaymentStatusLabel(selectedTenant.payment_status)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Informations personnelles</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Téléphone:</strong> {selectedTenant.phone}</p>
                  {selectedTenant.email && <p><strong>Email:</strong> {selectedTenant.email}</p>}
                  <p><strong>Adresse:</strong> {selectedTenant.address}, {selectedTenant.city}</p>
                  <p><strong>Profession:</strong> {selectedTenant.profession}</p>
                  <p><strong>Nationalité:</strong> {selectedTenant.nationality}</p>
                  <p><strong>Situation familiale:</strong> {selectedTenant.marital_status}</p>
                  {selectedTenant.spouse_name && (
                    <p><strong>Conjoint:</strong> {selectedTenant.spouse_name}</p>
                  )}
                  <p><strong>Nombre d'enfants:</strong> {selectedTenant.children_count}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Historique des contrats</h4>
                {selectedTenant.contracts && selectedTenant.contracts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTenant.contracts.map((contract: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <p className="font-medium">{contract.property_title}</p>
                        <p className="text-gray-600">
                          Du {new Date(contract.start_date).toLocaleDateString('fr-FR')}
                          {contract.end_date && ` au ${new Date(contract.end_date).toLocaleDateString('fr-FR')}`}
                        </p>
                        <Badge variant={contract.status === 'active' ? 'success' : 'secondary'} size="sm">
                          {contract.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucun historique de contrat disponible</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Note de confidentialité
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Les détails financiers ne sont pas affichés dans le cadre de la collaboration inter-agences.
                    Seules les informations de profil et l'historique de paiement sont partagées.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedTenant(null);
        }}
        title="Demande d'accès aux informations"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <p className="text-sm text-blue-800">
              Vous allez envoyer une demande de consultation de dossier à l'agence <strong>{selectedTenant?.agency_name}</strong> pour le candidat <strong>{selectedTenant?.redacted_name}</strong>.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Une fois validée, vous pourrez voir l'historique de paiement complet, les contrats passés et les notes de gestion.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-2xl">🎫</span>
            <div>
              <p className="text-sm font-bold text-amber-900">1 crédit sera débité</p>
              <p className="text-xs text-amber-700">Un crédit de collaboration (offert ou acheté) sera prélevé de votre portefeuille agence.</p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowRequestModal(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => handleRequestAccess(selectedTenant)}
              isLoading={requestingAccess}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Envoyer la demande
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};