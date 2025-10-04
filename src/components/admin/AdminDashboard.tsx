import React, { useState, useEffect } from 'react';
import { Shield, Building2, TrendingUp, Users, DollarSign, Award, Settings, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AgencyManagement } from './AgencyManagement';
import { SubscriptionManagement } from './SubscriptionManagement';
import { AgencyRankings } from './AgencyRankings';
import { PlatformSettings } from './PlatformSettings';
import { PlatformStats, Agency, SystemAlert } from '../../types/db';
import { dbService } from '../../lib/supabase';
import { getPlatformStats } from '../../lib/adminApi';
import { supabase } from '../../lib/config'; // Import supabase for storage operations
import { toast } from 'react-hot-toast';

interface AgencyRegistrationRequest {
  id: string;
  name: string;
  commercial_register: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  director_first_name: string;
  director_last_name: string;
  status: 'pending' | 'approved' | 'rejected';
  logo_temp_path?: string; // Chemin temporaire du logo dans storage
  // Ajoutez d'autres champs si nécessaire
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentAgencies, setRecentAgencies] = useState<Agency[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [requests, setRequests] = useState<AgencyRegistrationRequest[]>([]);

  useEffect(() => {
    const fetchPlatformStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const stats = await getPlatformStats();
        setPlatformStats(stats);

        // Récupérer les agences récemment inscrites
        const agencies = await dbService.agencies.getRecent(5);
        setRecentAgencies(agencies || []);

        // Récupérer les demandes en attente
        const pendingRequests = await dbService.agency_registration_request.getAll({ status: 'pending' });
        setRequests(pendingRequests || []);

        // Générer les alertes système basées sur les vraies données
        const alerts = await dbService.systemAlerts.systemAlerts();
        setSystemAlerts(alerts);
      } catch (error: any) {
        console.error('Error fetching platform stats:', error);
        setError(error.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchPlatformStats();

    // Refresh stats every 5 minutes
    const interval = setInterval(fetchPlatformStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const approve = async (request: AgencyRegistrationRequest) => {
    let transactionStarted = false;
    try {
      console.log('🔄 Début approbation pour request:', request.id);
      setLoading(true);

      // Mise à jour du status à approved
      const { data: updatedRequest, error: updateError } = await supabase
        .from('agency_registration_request')
        .update({
          status: 'approved',
          // approved_by: admin?.id, // Décommentez si vous avez admin.id
          approval_comments: 'Approved' // Ajoutez un champ pour comments si nécessaire
        })
        .eq('id', request.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('❌ Erreur update request:', updateError);
        throw updateError;
      }
      console.log('✅ Request mise à jour:', updatedRequest);
      transactionStarted = true;

      // Déplacer le logo si présent
      if (request.logo_temp_path) {
        const fileName = request.logo_temp_path.split('/').pop();
        if (!fileName) throw new Error('Nom de fichier invalide');

        // Vérifier si le fichier source existe
        const sourcePath = request.logo_temp_path;
        const bucket = 'agency-logos'; // Remplacez par le nom de votre bucket

        const { data: listData, error: listError } = await supabase.storage
          .from(bucket)
          .list(sourcePath.split('/').slice(0, -1).join('/'), { limit: 1, search: fileName });

        if (listError || !listData || listData.length === 0) {
          console.error('❌ Fichier logo source non trouvé:', listError);
          throw new Error('Fichier logo non trouvé');
        }

        // Déplacer le fichier
        const targetPath = `logos/${updatedRequest.created_agency_id}/${fileName}`;
        const { error: moveError } = await supabase.storage
          .from(bucket)
          .move(sourcePath, targetPath);

        if (moveError) {
          console.error('❌ Erreur move logo:', moveError);
          throw moveError;
        }

        console.log('✅ Logo déplacé vers:', targetPath);

        // Mettre à jour le chemin du logo dans l'agence
        const { error: updateAgencyError } = await supabase
          .from('agencies')
          .update({ logo: targetPath })
          .eq('id', updatedRequest.created_agency_id);

        if (updateAgencyError) {
          console.error('❌ Erreur update agency logo:', updateAgencyError);
          throw updateAgencyError;
        }
      }

      toast.success('Demande approuvée avec succès');
      fetchPlatformStats(); // Rafraîchir les stats
    } catch (err: any) {
      console.error('❌ Erreur approve:', err);
      toast.error(err.message || 'Erreur lors de l''approbation');
      if (transactionStarted) {
        // Rollback si possible
        await supabase
          .from('agency_registration_request')
          .update({ status: 'pending' })
          .eq('id', request.id);
        console.log('🔙 Rollback effectué');
      }
    } finally {
      setLoading(false);
    }
  };

  const reject = async (request: AgencyRegistrationRequest, comments: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('agency_registration_request')
        .update({
          status: 'rejected',
          // approved_by: admin?.id,
          approval_comments: comments
        })
        .eq('id', request.id);

      if (error) throw error;

      // Supprimer le logo temp si présent
      if (request.logo_temp_path) {
        const { error: removeError } = await supabase.storage.from('agency-logos').remove([request.logo_temp_path]);
        if (removeError) console.error('❌ Erreur suppression logo temp:', removeError);
      }

      toast.success('Demande rejetée');
      fetchPlatformStats();
    } catch (err: any) {
      console.error('❌ Erreur reject:', err);
      toast.error(err.message || 'Erreur lors du rejet');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Administration Gestion360Immo</h1>
                <p className="text-sm text-gray-500">Gestion globale de la plateforme</p>
              </div>
            </div>
            <Badge variant="danger" size="sm">Super Admin</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            {platformStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="inline-flex items-center justify-center p-3 rounded-lg bg-blue-500">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Agences Totales
                          </dt>
                          <dd className="text-lg font-semibold text-gray-900">
                            {platformStats.totalAgencies}
                          </dd>
                        </dl>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center text-sm">
                        <span className="text-green-600">
                          {platformStats.activeAgencies} actives
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="inline-flex items-center justify-center p-3 rounded-lg bg-green-500">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Revenus Plateforme
                          </dt>
                          <dd className="text-lg font-semibold text-gray-900">
                            {formatCurrency(platformStats.totalRevenue)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center text-sm">
                        <span className="text-green-600">
                          ↗ {platformStats.monthlyGrowth}% ce mois
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="inline-flex items-center justify-center p-3 rounded-lg bg-yellow-500">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Revenus Abonnements
                          </dt>
                          <dd className="text-lg font-semibold text-gray-900">
                            {formatCurrency(platformStats.subscriptionRevenue)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center text-sm">
                        <span className="text-blue-600">
                          Mensuel récurrent
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="inline-flex items-center justify-center p-3 rounded-lg bg-purple-500">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Propriétés Gérées
                          </dt>
                          <dd className="text-lg font-semibold text-gray-900">
                            {platformStats.totalProperties.toLocaleString()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center text-sm">
                        <span className="text-purple-600">
                          {platformStats.totalContracts} contrats actifs
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Agences Récemment Inscrites
                  </h3>
                  {recentAgencies.length > 0 ? (
                    <div className="space-y-3">
                      {recentAgencies.map((agency) => (
                        <div key={agency.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{agency.name}</p>
                            <p className="text-sm text-gray-500">{agency.city}</p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(agency.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Aucune agence récemment inscrite</p>
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Alertes Système
                  </h3>
                  {systemAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {systemAlerts.map((alert, index) => (
                        <div
                          key={index}
                          className={`flex items-center space-x-3 p-3 rounded-lg ${
                            alert.type === 'warning'
                              ? 'bg-yellow-50'
                              : alert.type === 'error'
                              ? 'bg-red-50'
                              : alert.type === 'success'
                              ? 'bg-green-50'
                              : 'bg-blue-50'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              alert.type === 'warning'
                                ? 'bg-yellow-500'
                                : alert.type === 'error'
                                ? 'bg-red-500'
                                : alert.type === 'success'
                                ? 'bg-green-500'
                                : 'bg-blue-500'
                            }`}
                          ></div>
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                alert.type === 'warning'
                                  ? 'text-yellow-800'
                                  : alert.type === 'error'
                                  ? 'text-red-800'
                                  : alert.type === 'success'
                                  ? 'text-green-800'
                                  : 'text-blue-800'
                              }`}
                            >
                              {alert.title}
                            </p>
                            <p
                              className={`text-xs ${
                                alert.type === 'warning'
                                  ? 'text-yellow-600'
                                  : alert.type === 'error'
                                  ? 'text-red-600'
                                  : alert.type === 'success'
                                  ? 'text-green-600'
                                  : 'text-blue-600'
                              }`}
                            >
                              {alert.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            Système opérationnel
                          </p>
                          <p className="text-xs text-green-600">Tous les services fonctionnent normalement</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Agency Requests Management */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Demandes d''approbation d''agences
                </h3>
                {requests.length > 0 ? (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div key={req.id} className="p-4 border rounded-lg">
                        <p>Nom: {req.name}</p>
                        <p>Registre: {req.commercial_register}</p>
                        <p>Email: {req.email}</p>
                        <p>Directeur: {req.director_first_name} {req.director_last_name}</p>
                        <p>Logo temp: {req.logo_temp_path || 'Aucun'}</p>
                        <div className="mt-2 space-x-2">
                          <Button onClick={() => approve(req)}>Approuver</Button>
                          <Button onClick={() => reject(req, 'Raison du rejet')}>Rejeter</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucune demande en attente</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === 'agencies' && <AgencyManagement />}
        {activeTab === 'subscriptions' && <SubscriptionManagement />}
        {activeTab === 'rankings' && <AgencyRankings />}
        {activeTab === 'settings' && <PlatformSettings />}
      </div>
    </div>
  );
};
