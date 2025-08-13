import React, { useState } from 'react';
import { Building2, Search, Eye, Settings, Ban, CheckCircle, AlertTriangle, Users, MapPin, Clock, UserPlus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { dbService, supabase } from '../../lib/supabase';
import { useEffect } from 'react';

export const AgencyManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'agencies' | 'requests'>('agencies');
  const [selectedAgency, setSelectedAgency] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const agenciesData = await dbService.getAllAgencies();
        const requestsData = await dbService.getRegistrationRequests();
        setAgencies(agenciesData);
        setRegistrationRequests(requestsData);
      } catch (error) {
        console.error('Error fetching agencies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgencies();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'danger';
      case 'trial': return 'warning';
      case 'cancelled': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'suspended': return 'Suspendu';
      case 'trial': return 'Essai';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'basic': return 'Basique';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Entreprise';
      default: return plan;
    }
  };

  const toggleAgencyStatus = async (agencyId: string) => {
    try {
      // Get current subscription status
      const { data: subscription, error: fetchError } = await supabase
        .from('agency_subscriptions')
        .select('status')
        .eq('agency_id', agencyId)
        .single();

      if (fetchError) throw fetchError;

      const newStatus = subscription.status === 'active' ? 'suspended' : 'active';

      // Update subscription status
      const { error: updateError } = await supabase
        .from('agency_subscriptions')
        .update({ status: newStatus })
        .eq('agency_id', agencyId);

      if (updateError) throw updateError;

      // Refresh agencies list
      const agenciesData = await dbService.getAllAgencies();
      setAgencies(agenciesData);
    } catch (error) {
      console.error('Error toggling agency status:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  const approveRegistration = async (requestId: string) => {
    try {
      console.log('Approbation de la demande:', requestId);
      
      // Vérifier si c'est une demande démo
      const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      const isDemoRequest = demoRequests.some((req: any) => req.id === requestId);
      
      if (isDemoRequest) {
        console.log('Approbation d\'une demande démo');
        const updatedRequests = demoRequests.map((req: any) => 
          req.id === requestId ? { 
            ...req, 
            status: 'approved',
            processed_at: new Date().toISOString(),
            processed_by: 'admin_demo'
          } : req
        );
        localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
        setRegistrationRequests(updatedRequests);
        
        const approvedRequest = updatedRequests.find(r => r.id === requestId);
        alert(`Demande démo approuvée avec succès !
        
Agence: ${approvedRequest?.agency_name || 'Inconnue'}

Cette demande de démonstration a été approuvée localement.
Dans un environnement de production, l'agence recevrait ses identifiants par email.`);
        return;
      }
      
      const result = await dbService.updateRegistrationRequest(requestId, {
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: 'admin_production_001' // ID de l'admin actuel
      });
      
      console.log('Résultat de l\'approbation:', result);
      
      // Refresh data
      const requestsData = await dbService.getRegistrationRequests();
      setRegistrationRequests(requestsData);
      
      alert(`Demande approuvée avec succès !
      
Agence: ${requestsData.find(r => r.id === requestId)?.agency_name || 'Inconnue'}

L'agence peut maintenant se connecter avec ses identifiants.
Un email de confirmation sera envoyé automatiquement.`);
      
    } catch (error) {
      console.error('Error approving registration:', error);
      
      // Messages d'erreur spécifiques
      if (error instanceof Error) {
        if (error.message.includes('permission denied')) {
          alert('Erreur de permissions - veuillez vérifier vos droits d\'administrateur');
        } else if (error.message.includes('not found')) {
          alert('Demande non trouvée - elle a peut-être déjà été traitée');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          alert('Problème de connexion - la demande a été approuvée localement');
        } else {
          alert(`Erreur lors de l'approbation: ${error.message}`);
        }
      } else {
        alert('Erreur inconnue lors de l\'approbation');
      }
    }
  };

  const rejectRegistration = async (requestId: string) => {
    const reason = prompt('Raison du rejet (optionnel):');
    
    try {
      console.log('Rejet de la demande:', requestId, 'Raison:', reason);
      
      // Vérifier si c'est une demande démo
      const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      const isDemoRequest = demoRequests.some((req: any) => req.id === requestId);
      
      if (isDemoRequest) {
        console.log('Rejet d\'une demande démo');
        const updatedRequests = demoRequests.map((req: any) => 
          req.id === requestId ? { 
            ...req, 
            status: 'rejected',
            admin_notes: reason || null,
            processed_at: new Date().toISOString(),
            processed_by: 'admin_demo'
          } : req
        );
        localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
        setRegistrationRequests(updatedRequests);
        
        alert(`Demande démo rejetée avec succès.
        
${reason ? `Raison: ${reason}` : 'Aucune raison spécifiée'}

Cette demande de démonstration a été rejetée localement.`);
        return;
      }
      
      const result = await dbService.updateRegistrationRequest(requestId, {
        status: 'rejected',
        admin_notes: reason || null,
        processed_at: new Date().toISOString(),
        processed_by: 'admin_production_001'
      });
      
      console.log('Résultat du rejet:', result);
      
      // Refresh data
      const requestsData = await dbService.getRegistrationRequests();
      setRegistrationRequests(requestsData);
      
      alert(`Demande rejetée avec succès.
      
${reason ? `Raison: ${reason}` : 'Aucune raison spécifiée'}

L'agence sera notifiée par email.`);
      
    } catch (error) {
      console.error('Error rejecting registration:', error);
      
      // Messages d'erreur spécifiques
      if (error instanceof Error) {
        if (error.message.includes('permission denied')) {
          alert('Erreur de permissions - veuillez vérifier vos droits d\'administrateur');
        } else if (error.message.includes('not found')) {
          alert('Demande non trouvée - elle a peut-être déjà été traitée');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          alert('Problème de connexion - la demande a été rejetée localement');
        } else {
          alert(`Erreur lors du rejet: ${error.message}`);
        }
      } else {
        alert('Erreur inconnue lors du rejet');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredAgencies = agencies.filter(agency => {
    const matchesSearch = agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agency.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (agency.director_name && agency.director_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || agency.subscription_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gestion des Agences</h2>
        <div className="flex items-center space-x-3">
          <Badge variant="warning" size="sm">
            {registrationRequests.filter(r => r.status === 'pending').length} demande(s) en attente
          </Badge>
          <Badge variant="info" size="sm">
            {agencies.length} agences inscrites
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('agencies')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'agencies'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Agences Actives ({agencies.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'requests'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Demandes d'Inscription ({registrationRequests.filter(r => r.status === 'pending').length})</span>
          </button>
        </nav>
      </div>

      {/* Filters */}
      {activeTab === 'agencies' && (
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, ville ou directeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="suspended">Suspendu</option>
            <option value="trial">Essai</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
      </Card>
      )}

      {/* Agencies Tab */}
      {activeTab === 'agencies' && (
        agencies.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAgencies.map((agency) => (
          <Card key={agency.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agency.name}</h3>
                    <p className="text-sm text-gray-500">{agency.commercial_register}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(agency.subscription_status)} size="sm">
                    {getStatusLabel(agency.subscription_status)}
                  </Badge>
                  {agency.plan_type && (
                    <Badge variant="secondary" size="sm">
                      {getPlanLabel(agency.plan_type)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{agency.city}</span>
                </div>
                {agency.director_name && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Directeur: {agency.director_name}</span>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  <span>Email: {agency.email}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span>Téléphone: {agency.phone}</span>
                </div>
              </div>

              {/* Stats */}
              {agency.stats && (
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{agency.stats.total_properties || 0}</div>
                    <div className="text-xs text-gray-500">Propriétés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{agency.stats.total_contracts || 0}</div>
                    <div className="text-xs text-gray-500">Contrats</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{agency.stats.total_users || 0}</div>
                    <div className="text-xs text-gray-500">Utilisateurs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(agency.stats.monthly_revenue || 0).replace(' FCFA', '')}
                    </div>
                    <div className="text-xs text-gray-500">CA (FCFA)</div>
                  </div>
                </div>
              )}

              {/* Subscription Info */}
              {agency.monthly_fee && (
                <div className="p-3 bg-blue-50 rounded-lg mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">Abonnement mensuel:</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrency(agency.monthly_fee)}
                    </span>
                  </div>
                  {agency.next_payment_date && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-blue-800">Prochain paiement:</span>
                      <span className="font-medium text-blue-900">
                        {new Date(agency.next_payment_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Inscrite le {new Date(agency.created_at).toLocaleDateString('fr-FR')}
                </span>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAgency(agency);
                      setShowDetails(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAgencyStatus(agency.id)}
                    className={agency.subscription_status === 'active' ? 'text-red-600' : 'text-green-600'}
                  >
                    {agency.subscription_status === 'active' ? (
                      <Ban className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        </div>
        ) : (
        <Card className="p-8 text-center">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune agence inscrite
          </h3>
          <p className="text-gray-600">
            Les nouvelles agences apparaîtront ici après leur inscription.
          </p>
        </Card>
        )
      )}

      {/* Registration Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {registrationRequests.filter(r => r.status === 'pending').length > 0 ? (
            registrationRequests
              .filter(r => r.status === 'pending')
              .map((request) => (
                <Card key={request.id} className="border-l-4 border-l-yellow-500">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{request.agency_name}</h3>
                          <p className="text-sm text-gray-500">Demande d'inscription</p>
                        </div>
                      </div>
                      <Badge variant="warning" size="sm">En attente</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Informations agence</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Registre:</strong> {request.commercial_register}</p>
                          <p><strong>Ville:</strong> {request.city}</p>
                          <p><strong>Adresse:</strong> {request.address}</p>
                          <p><strong>Téléphone:</strong> {request.phone}</p>
                          {request.is_accredited && (
                            <p><strong>Agrément:</strong> {request.accreditation_number}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Directeur</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Nom:</strong> {request.director_first_name} {request.director_last_name}</p>
                          <p><strong>Email:</strong> {request.director_email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-xs text-gray-500">
                        Demande reçue le {new Date(request.created_at).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(request.created_at).toLocaleTimeString('fr-FR')}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => approveRegistration(request.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => rejectRegistration(request.id)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
          ) : (
            <Card className="p-8 text-center">
              <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune demande en attente
              </h3>
              <p className="text-gray-600">
                Les nouvelles demandes d'inscription apparaîtront ici.
              </p>
            </Card>
          )}

          {/* Processed Requests */}
          {registrationRequests.filter(r => r.status !== 'pending').length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Demandes traitées</h3>
              <div className="space-y-3">
                {registrationRequests
                  .filter(r => r.status !== 'pending')
                  .slice(0, 5)
                  .map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{request.agency_name}</p>
                        <p className="text-sm text-gray-500">
                          {request.director_first_name} {request.director_last_name} • {request.director_email}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={request.status === 'approved' ? 'success' : 'danger'} size="sm">
                          {request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(request.processed_at || request.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agency Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedAgency(null);
        }}
        title="Détails de l'agence"
        size="lg"
      >
        {selectedAgency && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informations générales</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Nom:</strong> {selectedAgency.name}</p>
                  <p><strong>Registre:</strong> {selectedAgency.commercial_register}</p>
                  <p><strong>Ville:</strong> {selectedAgency.city}</p>
                  {selectedAgency.director_name && (
                    <p><strong>Directeur:</strong> {selectedAgency.director_name}</p>
                  )}
                  <p><strong>Email:</strong> {selectedAgency.email}</p>
                  <p><strong>Téléphone:</strong> {selectedAgency.phone}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Statistiques</h4>
                {selectedAgency.stats ? (
                  <div className="space-y-2 text-sm">
                    <p><strong>Propriétés gérées:</strong> {selectedAgency.stats.total_properties || 0}</p>
                    <p><strong>Contrats actifs:</strong> {selectedAgency.stats.total_contracts || 0}</p>
                    <p><strong>Utilisateurs:</strong> {selectedAgency.stats.total_users || 0}</p>
                    <p><strong>Chiffre d'affaires:</strong> {formatCurrency(selectedAgency.stats.monthly_revenue || 0)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Statistiques en cours de calcul...</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Abonnement</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Plan:</strong> {getPlanLabel(selectedAgency.plan_type || 'basic')}</p>
                    <p><strong>Statut:</strong> 
                      <Badge variant={getStatusColor(selectedAgency.subscription_status)} size="sm" className="ml-2">
                        {getStatusLabel(selectedAgency.subscription_status)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p><strong>Montant mensuel:</strong> {formatCurrency(selectedAgency.monthly_fee || 0)}</p>
                    {selectedAgency.next_payment_date && (
                      <p><strong>Prochain paiement:</strong> {new Date(selectedAgency.next_payment_date).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setShowDetails(false)}>
                Fermer
              </Button>
              <Button 
                variant={selectedAgency.subscription_status === 'active' ? 'danger' : 'secondary'}
                onClick={() => toggleAgencyStatus(selectedAgency.id)}
              >
                {selectedAgency.subscription_status === 'active' ? 'Suspendre' : 'Activer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};