import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, UserPlus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { dbService } from '../../lib/supabase';
import { RegistrationRequestCard } from './RegistrationRequestCard';
import { AgencyDetailsModal } from './AgencyDetailsModal';
import { AgencyCard } from './AgencyCard';
import { useAuth } from '../../contexts/AuthContext';
import { Agency, AgencyRegistrationRequest, SubscriptionStatus, PlanType } from '../../types/db';
import { BadgeVariant } from '../../types/ui';

// Interface pour les notifications toast
interface Toast {
  message: string;
  type: 'success' | 'error';
}

export const AgencyManagement: React.FC = () => {
  const { admin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'agencies' | 'requests'>('requests');
  const [selectedAgency, setSelectedAgency] = useState<(Agency & { subscription_status?: SubscriptionStatus; plan_type?: PlanType; monthly_fee?: number }) | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [agencies, setAgencies] = useState<(Agency & { subscription_status?: SubscriptionStatus; plan_type?: PlanType; monthly_fee?: number })[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<AgencyRegistrationRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Fonction pour afficher les notifications toast
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Auto-dismiss après 3 secondes
  }, []);

  // Rediriger si non authentifié ou non admin
  useEffect(() => {
    if (isLoading) return;
    if (!admin) {
      setError('Vous devez être connecté en tant qu’administrateur pour accéder à cette page.');
      navigate('/login');
      return;
    }
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      setError('Vous devez être administrateur pour accéder à cette page.');
      navigate('/login');
    }
  }, [admin, isLoading, navigate]);

  // Charger les données depuis Supabase
  const fetchData = useCallback(async () => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé. Veuillez vous connecter en tant qu’administrateur.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [requests, agencies, subscriptions] = await Promise.all([
        dbService.agencyRegistrationRequests.getAll(),
        dbService.agencies.getAll(),
        dbService.agencySubscriptions.getAll(),
      ]);

      // Combiner les données des agences avec leurs abonnements
      const enrichedAgencies = agencies.map(agency => {
        const subscription = subscriptions.find(sub => sub.agency_id === agency.id);
        return {
          ...agency,
          subscription_status: subscription?.status,
          plan_type: subscription?.plan_type,
          monthly_fee: subscription?.monthly_fee,
        };
      });

      setRegistrationRequests(requests);
      setAgencies(enrichedAgencies);
    } catch (err: any) {
      console.error('❌ Erreur chargement:', err);
      const errorMessage = err.message || 'Erreur lors du chargement des données';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [admin, showToast]);

  useEffect(() => {
    if (admin && (admin.role === 'admin' || admin.role === 'super_admin')) {
      fetchData();
    }
  }, [admin, fetchData]);

  // Approuver une demande
  const approveRegistration = useCallback(async (requestId: string) => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Vous devez être connecté en tant qu’administrateur pour approuver une demande.');
      showToast('Accès non autorisé', 'error');
      return;
    }

    try {
      await dbService.agencyRegistrationRequests.approve(requestId);
      setError(null);
      showToast('Agence approuvée avec succès !', 'success');
      fetchData();
    } catch (error: any) {
      console.error('❌ Erreur approbation:', error);
      const errorMessage = error.message || 'Erreur inconnue lors de l’approbation';
      setError(errorMessage);
      showToast(`Erreur: ${errorMessage}`, 'error');
    }
  }, [admin, showToast, fetchData]);

  // Rejeter une demande
  const rejectRegistration = useCallback(async (requestId: string) => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Vous devez être connecté en tant qu’administrateur pour rejeter une demande.');
      showToast('Accès non autorisé', 'error');
      return;
    }

    const reason = prompt('Raison du rejet (optionnel):');
    try {
      await dbService.agencyRegistrationRequests.reject(requestId, reason || undefined);
      setError(null);
      showToast(`Demande rejetée${reason ? ` : ${reason}` : ''}`, 'success');
      fetchData();
    } catch (error: any) {
      console.error('❌ Erreur rejet:', error);
      const errorMessage = error.message || 'Erreur inconnue lors du rejet';
      setError(errorMessage);
      showToast(`Erreur: ${errorMessage}`, 'error');
    }
  }, [admin, showToast, fetchData]);

  // Helpers UI
  const getStatusColor = (status: SubscriptionStatus): BadgeVariant => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'danger';
      case 'trial':
        return 'warning';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: SubscriptionStatus): string => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'suspended':
        return 'Suspendu';
      case 'trial':
        return 'Essai';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getPlanLabel = (plan: PlanType): string => {
    switch (plan) {
      case 'basic':
        return 'Basique';
      case 'premium':
        return 'Premium';
      case 'enterprise':
        return 'Entreprise';
      default:
        return plan;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const pendingRequests = registrationRequests.filter((r) => r.status === 'pending');
  const processedRequests = registrationRequests.filter((r) => r.status !== 'pending');

  if (loading || isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Gestion des Agences</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Gestion des Agences</h2>
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchData}>
            Réessayer
          </Button>
        </Card>
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

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

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
              <RegistrationRequestCard
                key={request.id}
                request={request}
                approveRegistration={approveRegistration}
                rejectRegistration={rejectRegistration}
              />
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
              <Button variant="outline" onClick={fetchData}>
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
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{request.agency_name}</p>
                      <p className="text-sm text-gray-500">
                        {request.director_first_name} {request.director_last_name} •{' '}
                        {request.director_email}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={request.status === 'approved' ? 'success' : 'danger'}
                        size="sm"
                      >
                        {request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {request.processed_at
                          ? new Date(request.processed_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Date inconnue'}
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
            <div className="flex flex-col md:flex-row gap-4 p-4">
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
                onChange={(e) => setFilterStatus(e.target.value as SubscriptionStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="trial">Essai</option>
                <option value="suspended">Suspendu</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </Card>

          {agencies.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {agencies
                .filter((agency) => {
                  const matchesSearch =
                    agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    agency.city.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesStatus =
                    filterStatus === 'all' ||
                    agency.subscription_status === filterStatus;
                  return matchesSearch && matchesStatus;
                })
                .map((agency) => (
                  <AgencyCard
                    key={agency.id}
                    agency={agency}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    getPlanLabel={getPlanLabel}
                    formatCurrency={formatCurrency}
                    setSelectedAgency={setSelectedAgency}
                    setShowDetails={setShowDetails}
                  />
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

      <AgencyDetailsModal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedAgency(null);
        }}
        selectedAgency={selectedAgency}
        getStatusColor={getStatusColor}
        getStatusLabel={getStatusLabel}
        getPlanLabel={getPlanLabel}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};