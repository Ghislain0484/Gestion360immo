import React, { useState, useEffect } from 'react';
import { Building2, Search, Eye, Settings, Ban, CheckCircle, AlertTriangle, Users, MapPin, Clock, UserPlus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { dbService } from '../../lib/supabase';

export const AgencyManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'agencies' | 'requests'>('requests');
  const [selectedAgency, setSelectedAgency] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      console.log('🔄 Chargement données admin...');
      setLoading(true);
      setError(null);
      
      try {
        // Charger les demandes d'inscription depuis localStorage
        const localRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        console.log('📋 Demandes localStorage:', localRequests.length);
        
        // Charger les agences approuvées depuis localStorage
        const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
        const agenciesFromApproved = approvedAccounts.map((acc: any) => acc.agencyData).filter(Boolean);
        console.log('🏢 Agences approuvées:', agenciesFromApproved.length);
        
        setRegistrationRequests(localRequests);
        setAgencies(agenciesFromApproved);
        
        console.log('✅ Données chargées avec succès');
        
      } catch (error) {
        console.error('❌ Erreur chargement données admin:', error);
        setError('Erreur lors du chargement des données');
        
        // En cas d'erreur, initialiser avec des tableaux vides
        setRegistrationRequests([]);
        setAgencies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const approveRegistration = async (requestId: string) => {
    try {
      console.log('🔄 Approbation demande:', requestId);
      
      // Trouver la demande
      const request = registrationRequests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Demande non trouvée');
      }
      
      console.log('📋 Demande trouvée:', request.agency_name);
      
      // Créer le compte approuvé
      const approvedAccount = {
        id: `approved_${Date.now()}`,
        email: request.director_email,
        password: request.director_password || 'demo123',
        firstName: request.director_first_name,
        lastName: request.director_last_name,
        role: 'director',
        agencyId: `agency_${Date.now()}`,
        agencyData: {
          id: `agency_${Date.now()}`,
          name: request.agency_name,
          commercial_register: request.commercial_register,
          address: request.address,
          city: request.city,
          phone: request.phone,
          email: request.director_email,
          director_id: `approved_${Date.now()}`,
          created_at: new Date().toISOString(),
          subscription_status: 'trial',
          plan_type: 'basic',
          monthly_fee: 25000
        },
        createdAt: new Date().toISOString()
      };
      
      // Sauvegarder le compte approuvé
      const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
      approvedAccounts.push(approvedAccount);
      localStorage.setItem('approved_accounts', JSON.stringify(approvedAccounts));
      
      // Marquer la demande comme approuvée
      const updatedRequests = registrationRequests.map(r => 
        r.id === requestId 
          ? { 
              ...r, 
              status: 'approved',
              processed_at: new Date().toISOString(),
              processed_by: 'admin_production'
            }
          : r
      );
      
      localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
      
      // Mettre à jour les états
      setRegistrationRequests(updatedRequests);
      setAgencies(prev => [...prev, approvedAccount.agencyData]);
      
      console.log('✅ Agence approuvée:', approvedAccount.agencyData.name);
      
      alert(`✅ AGENCE APPROUVÉE AVEC SUCCÈS !
      
🏢 AGENCE : ${request.agency_name}
👤 DIRECTEUR : ${request.director_first_name} ${request.director_last_name}
📧 EMAIL : ${request.director_email}
🔑 MOT DE PASSE : ${request.director_password || 'demo123'}

✅ L'agence a été créée et activée
✅ Le compte directeur est opérationnel
✅ Abonnement d'essai de 30 jours démarré

IDENTIFIANTS DE CONNEXION :
Email : ${request.director_email}
Mot de passe : ${request.director_password || 'demo123'}

🌐 Le directeur peut maintenant se connecter sur :
www.gestion360immo.com

L'agence apparaîtra dans l'onglet "Agences Actives".`);
      
    } catch (error) {
      console.error('❌ Erreur approbation:', error);
      alert(`❌ Erreur lors de l'approbation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const rejectRegistration = async (requestId: string) => {
    const reason = prompt('Raison du rejet (optionnel):');
    
    try {
      console.log('🔄 Rejet demande:', requestId);
      
      const updatedRequests = registrationRequests.map(r => 
        r.id === requestId 
          ? { 
              ...r, 
              status: 'rejected',
              admin_notes: reason || null,
              processed_at: new Date().toISOString(),
              processed_by: 'admin_production'
            }
          : r
      );
      
      localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
      setRegistrationRequests(updatedRequests);
      
      alert(`✅ Demande rejetée avec succès.
      
${reason ? `Raison: ${reason}` : 'Aucune raison spécifiée'}

L'agence sera notifiée du rejet.`);
      
    } catch (error) {
      console.error('❌ Erreur rejet:', error);
      alert(`❌ Erreur lors du rejet: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const pendingRequests = registrationRequests.filter(r => r.status === 'pending');
  const processedRequests = registrationRequests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Gestion des Agences</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gestion des Agences</h2>
        <div className="flex items-center space-x-3">
          <Badge variant="warning" size="sm">
            {pendingRequests.length} demande(s) en attente
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
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'requests'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Demandes d'Inscription ({pendingRequests.length})</span>
          </button>
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
        </nav>
      </div>

      {/* Registration Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {pendingRequests.length > 0 ? (
            pendingRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-yellow-500">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {request.agency_name || 'Nom non spécifié'}
                        </h3>
                        <p className="text-sm text-gray-500">Demande d'inscription</p>
                      </div>
                    </div>
                    <Badge variant="warning" size="sm">En attente</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Informations agence</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>Nom:</strong> {request.agency_name || 'Non spécifié'}</p>
                        <p><strong>Registre:</strong> {request.commercial_register || 'Non spécifié'}</p>
                        <p><strong>Ville:</strong> {request.city || 'Non spécifiée'}</p>
                        <p><strong>Adresse:</strong> {request.address || 'Non spécifiée'}</p>
                        <p><strong>Téléphone:</strong> {request.phone || 'Non spécifié'}</p>
                        {request.is_accredited && (
                          <p><strong>Agrément:</strong> {request.accreditation_number || 'Oui'}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Directeur</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>Nom:</strong> {request.director_first_name || 'Non spécifié'} {request.director_last_name || ''}</p>
                        <p><strong>Email:</strong> {request.director_email || 'Non spécifié'}</p>
                        <p><strong>Mot de passe:</strong> {request.director_password ? '••••••••' : 'Non défini'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-xs text-gray-500">
                      Demande reçue le {request.created_at ? new Date(request.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
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
              <p className="text-gray-600 mb-4">
                Les nouvelles demandes d'inscription apparaîtront ici.
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Actualiser
              </Button>
            </Card>
          )}

          {/* Processed Requests */}
          {processedRequests.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Demandes traitées récemment</h3>
              <div className="space-y-3">
                {processedRequests.slice(0, 5).map((request) => (
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
                        {request.processed_at ? 
                          new Date(request.processed_at).toLocaleDateString('fr-FR') : 
                          'Date inconnue'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agencies Tab */}
      {activeTab === 'agencies' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, ville..."
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
                <option value="trial">Essai</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>
          </Card>

          {agencies.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {agencies
                .filter(agency => {
                  const matchesSearch = agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     agency.city.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesStatus = filterStatus === 'all' || agency.subscription_status === filterStatus;
                  return matchesSearch && matchesStatus;
                })
                .map((agency) => (
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
                          <Badge variant="secondary" size="sm">
                            {getPlanLabel(agency.plan_type)}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{agency.city}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>Email: {agency.email}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>Téléphone: {agency.phone}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-lg mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-800">Abonnement mensuel:</span>
                          <span className="font-medium text-blue-900">
                            {formatCurrency(agency.monthly_fee)}
                          </span>
                        </div>
                      </div>

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
                Aucune agence active
              </h3>
              <p className="text-gray-600">
                Les agences approuvées apparaîtront ici.
              </p>
            </Card>
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
                  <p><strong>Email:</strong> {selectedAgency.email}</p>
                  <p><strong>Téléphone:</strong> {selectedAgency.phone}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Abonnement</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Plan:</strong> {getPlanLabel(selectedAgency.plan_type)}</p>
                  <p><strong>Statut:</strong> 
                    <Badge variant={getStatusColor(selectedAgency.subscription_status)} size="sm" className="ml-2">
                      {getStatusLabel(selectedAgency.subscription_status)}
                    </Badge>
                  </p>
                  <p><strong>Montant mensuel:</strong> {formatCurrency(selectedAgency.monthly_fee)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setShowDetails(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};