import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, UserPlus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { RegistrationRequestCard } from './RegistrationRequestCard';
import { AgencyDetailsModal } from './AgencyDetailsModal';
import { AgencyCard } from './AgencyCard';
import { useAuth } from '../../contexts/AuthContext';
import { Agency, AgencyRegistrationRequest } from '../../types/db';
import { BadgeVariant, SubscriptionStatus, PlanType } from '../../types/enums';
import { dbService } from '../../lib/supabase';
import { agenciesService } from '../../lib/db/agenciesService';
import toast from 'react-hot-toast';

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
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      const [agenciesData, requestsData] = await Promise.all([
        dbService.agencies.getAll(),
        dbService.agencyRegistrationRequests.getAll()
      ]);

      const enrichedAgencies = (agenciesData || []).map(agency => {
        const sub = (agency as any).subscription;
        return {
          ...agency,
          subscription_status: sub?.status || agency.subscription_status || 'active',
          plan_type: sub?.plan_type || agency.plan_type || 'basic',
          monthly_fee: sub?.monthly_fee || agency.monthly_fee || 0
        };
      });

      setAgencies(enrichedAgencies);
      setRegistrationRequests(requestsData || []);
    } catch (err: any) {
      console.error('❌ Erreur chargement:', err);
      const errorMessage = err.message || 'Erreur lors du chargement des données';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    if (admin && (admin.role === 'admin' || admin.role === 'super_admin')) {
      fetchData();
    }
  }, [admin, fetchData]);

  // Approuver une demande
  const approveRegistration = useCallback(async (requestId: string) => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      toast.error('Accès non autorisé');
      return;
    }

    try {
      await dbService.agencyRegistrationRequests.approve(requestId);
      setError(null);
      toast.success('Agence approuvée avec succès !');
      fetchData();
    } catch (err: any) {
      console.error('❌ Erreur approbation:', err);
      const errorMessage = err.message || 'Erreur inconnue lors de l’approbation';
      toast.error(`Erreur: ${errorMessage}`);
    }
  }, [admin, fetchData]);

  // Rejeter une demande
  const rejectRegistration = useCallback(async (requestId: string) => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      toast.error('Accès non autorisé');
      return;
    }

    const reason = prompt('Raison du rejet (optionnel):');
    try {
      await dbService.agencyRegistrationRequests.reject(requestId, reason || undefined);
      setError(null);
      toast.success(`Demande rejetée${reason ? ` : ${reason}` : ''}`);
      fetchData();
    } catch (err: any) {
      console.error('❌ Erreur rejet:', err);
      const errorMessage = err.message || 'Erreur inconnue lors du rejet';
      toast.error(`Erreur: ${errorMessage}`);
    }
  }, [admin, fetchData]);

  // Mettre à jour une agence (Modules, Statut)
  const handleUpdateAgency = useCallback(async (id: string, updates: Partial<Agency>) => {
    setIsUpdating(true);
    try {
      await agenciesService.update(id, updates);
      toast.success('Agence mise à jour avec succès');
      fetchData();
    } catch (err: any) {
      console.error('❌ Erreur mise à jour:', err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdating(false);
    }
  }, [fetchData]);

  // Helpers UI
  const getStatusColor = (status: SubscriptionStatus): BadgeVariant => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'danger';
      case 'trial': return 'warning';
      case 'cancelled': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: SubscriptionStatus): string => {
    switch (status) {
      case 'active': return 'Actif';
      case 'suspended': return 'Suspendu';
      case 'trial': return 'Essai';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getPlanLabel = (plan: PlanType): string => {
    switch (plan) {
      case 'basic': return 'Basique';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Entreprise';
      default: return plan;
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

      {activeTab === 'agencies' && (
        <div className="space-y-6">
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
        onUpdate={handleUpdateAgency}
        isUpdating={isUpdating}
      />
    </div>
  );
};