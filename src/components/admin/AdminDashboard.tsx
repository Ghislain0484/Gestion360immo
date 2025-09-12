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

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentAgencies, setRecentAgencies] = useState<Agency[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);

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

  const adminTabs = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'agencies', name: 'Gestion Agences', icon: Building2 },
    { id: 'subscriptions', name: 'Abonnements', icon: DollarSign },
    { id: 'rankings', name: 'Classements', icon: Award },
    { id: 'settings', name: 'Paramètres', icon: Settings },
  ];

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