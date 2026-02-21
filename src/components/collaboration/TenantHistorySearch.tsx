import React, { useState } from 'react';
import { Search, UserCheck, Phone, MapPin, Briefcase, Flag, AlertTriangle, CheckCircle, XCircle, Building2, MessageSquare } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Tenant, Contract, Message, Notification } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { dbService } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TenantHistory extends Tenant {
  agency_name: string;
  contracts: Array<Contract & { property_title: string }>;
}

export const TenantHistorySearch: React.FC = () => {
  const { user, agencyId: authAgencyId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'bon' | 'irregulier' | 'mauvais'>('all');
  const [tenants, setTenants] = useState<TenantHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantHistory | null>(null);
  const [showDetails, setShowDetails] = useState(false);



  const searchTenants = async () => {
    if (!searchTerm.trim() || !authAgencyId) {
      toast.error('Veuillez entrer un terme de recherche et être associé à une agence');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('tenants')
        .select(`
          *,
          agencies!inner(name),
          contracts (
            *,
            properties!inner(title)
          )
        `)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .eq('agencies.is_active', true)
        .neq('agency_id', authAgencyId);

      if (paymentFilter !== 'all') {
        query = query.eq('payment_status', paymentFilter);
      }

      const { data, error } = await query.order('last_name', { ascending: true });

      if (error) throw new Error(`❌ tenants.select | ${error.message}`);

      const formattedData: TenantHistory[] = data?.map((tenant) => ({
        ...tenant,
        agency_name: tenant.agencies.name,
        contracts: tenant.contracts.map((contract: Contract & { properties: { title: string } }) => ({
          ...contract,
          property_title: contract.properties.title,
        })),
      })) ?? [];

      setTenants(formattedData);
    } catch (err: any) {
      console.error('Erreur lors de la recherche:', err);
      setError(err.message || 'Erreur lors de la recherche des locataires');
      toast.error(err.message || 'Erreur lors de la recherche des locataires');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (tenant: TenantHistory) => {
    if (!user?.id || !authAgencyId) {
      toast.error('Utilisateur non authentifié ou agence non trouvée');
      return;
    }

    try {
      const { data: agencyDirector, error: directorError } = await supabase
        .from('agency_users')
        .select('user_id')
        .eq('agency_id', tenant.agency_id)
        .eq('role', 'director')
        .single();

      if (directorError || !agencyDirector) {
        throw new Error('Directeur de l\'agence introuvable');
      }

      const message: Partial<Message> = {
        sender_id: user.id,
        receiver_id: agencyDirector.user_id,
        agency_id: tenant.agency_id,
        subject: `Demande de collaboration pour ${tenant.first_name} ${tenant.last_name}`,
        content: `Bonjour, je suis intéressé par une collaboration concernant le locataire ${tenant.first_name} ${tenant.last_name}. Merci de me contacter pour discuter.`,
        is_read: false,
        created_at: new Date().toISOString(),
        attachments: [],
      };

      await dbService.messages.create(message);

      const notification: Partial<Notification> = {
        user_id: agencyDirector.user_id,
        type: 'new_message' as 'new_message',
        title: 'Nouveau message concernant un locataire',
        message: `L'agence ${authAgencyId} vous a envoyé un message à propos de ${tenant.first_name} ${tenant.last_name}.`,
        priority: 'medium' as 'medium',
        data: { tenant_id: tenant.id },
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

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchTenants()}
                />
              </div>
            </div>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'bon' | 'irregulier' | 'mauvais')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="bon">Bons payeurs</option>
              <option value="irregulier">Payeurs irréguliers</option>
              <option value="mauvais">Mauvais payeurs</option>
            </select>

            <Button onClick={searchTenants} disabled={loading || !searchTerm.trim() || !authAgencyId}>
              {loading ? 'Recherche...' : 'Rechercher'}
            </Button>
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
                    {tenant.photo_url ? (
                      <img
                        src={tenant.photo_url}
                        alt={`${tenant.first_name} ${tenant.last_name}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {tenant.first_name} {tenant.last_name}
                      </h5>
                      <div className="flex items-center text-xs text-gray-500">
                        <Building2 className="h-3 w-3 mr-1" />
                        <span>{tenant.agency_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-3 w-3 mr-2" />
                      <span>{tenant.phone}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-3 w-3 mr-2" />
                      <span>{tenant.city}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Briefcase className="h-3 w-3 mr-2" />
                      <span>{tenant.profession}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Flag className="h-3 w-3 mr-2" />
                      <span>{tenant.nationality}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Statut de paiement:</span>
                      <Badge variant={getPaymentStatusColor(tenant.payment_status)} size="sm">
                        <div className="flex items-center space-x-1">
                          {getPaymentStatusIcon(tenant.payment_status)}
                          <span>{getPaymentStatusLabel(tenant.payment_status)}</span>
                        </div>
                      </Badge>
                    </div>

                    {tenant.contracts && tenant.contracts.length > 0 && (
                      <div className="text-xs text-gray-500">
                        <p>{tenant.contracts.length} contrat(s) dans l'historique</p>
                        <p>Dernier: {tenant.contracts[0]?.property_title}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setShowDetails(true);
                      }}
                    >
                      Voir l'historique complet
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleContact(tenant)}
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

      {!loading && tenants.length === 0 && searchTerm && (
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
                  <UserCheck className="h-8 w-8 text-blue-600" />
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
                    {selectedTenant.contracts.map((contract, index) => (
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
    </div>
  );
};