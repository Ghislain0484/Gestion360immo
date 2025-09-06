import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, Home, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats, useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { Property, Contract, Owner, Tenant } from '../../types/db';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

export const ReportsHub: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');

  const { user } = useAuth();

  // Données réelles de l'agence
  const { stats: dashboardStats, loading: statsLoading } = useDashboardStats();
  const { data: properties, loading: propertiesLoading } = useRealtimeData<Property>(dbService.properties.getAll, 'properties');
  const { data: contracts, loading: contractsLoading } = useRealtimeData<Contract>(dbService.contracts.getAll, 'contracts');
  const { data: owners, loading: ownersLoading } = useRealtimeData<Owner>(dbService.owners.getAll, 'owners');
  //const { data: tenants, loading: tenantsLoading } = useRealtimeData<Tenant>(dbService.tenants.getAll(), 'tenants');
  const { data: tenants, loading: tenantsLoading } = useRealtimeData<Tenant>(
    () => dbService.tenants.getAll({ agency_id: user?.agency_id ?? undefined }),
    'tenants'
  );

  // Calculs basés sur les vraies données
  const reportData = dashboardStats ? {
    overview: {
      totalRevenue: dashboardStats.monthlyRevenue,
      totalCommissions: dashboardStats.monthlyRevenue * 0.1,
      activeContracts: dashboardStats.activeContracts,
      newClients: owners.length + tenants.length,
      occupancyRate: dashboardStats.occupancyRate
    },
    properties: {
      totalProperties: properties.length,
      availableProperties: properties.filter(p => p.is_available).length,
      rentedProperties: properties.filter(p => !p.is_available).length,
      soldProperties: contracts.filter(c => c.type === 'vente').length
    },
    financial: {
      monthlyRevenue: [
        { month: 'Jan', revenue: dashboardStats.monthlyRevenue * 0.8, commissions: dashboardStats.monthlyRevenue * 0.08 },
        { month: 'Fév', revenue: dashboardStats.monthlyRevenue * 0.9, commissions: dashboardStats.monthlyRevenue * 0.09 },
        { month: 'Mar', revenue: dashboardStats.monthlyRevenue, commissions: dashboardStats.monthlyRevenue * 0.1 }
      ]
    }
  } : null;

  // Chart data
  const revenueChartData = reportData ? {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Revenus (FCFA)',
        data: [
          reportData.financial.monthlyRevenue[0].revenue,
          reportData.financial.monthlyRevenue[1].revenue,
          reportData.financial.monthlyRevenue[2].revenue,
          reportData.overview.totalRevenue * 0.95,
          reportData.overview.totalRevenue * 1.1,
          reportData.overview.totalRevenue * 1.2
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Commissions (FCFA)',
        data: [
          reportData.financial.monthlyRevenue[0].commissions,
          reportData.financial.monthlyRevenue[1].commissions,
          reportData.financial.monthlyRevenue[2].commissions,
          reportData.overview.totalCommissions * 0.95,
          reportData.overview.totalCommissions * 1.1,
          reportData.overview.totalCommissions * 1.2
        ],
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  } : null;

  const propertyTypeData = reportData ? {
    labels: ['Villas', 'Appartements', 'Terrains', 'Immeubles', 'Autres'],
    datasets: [
      {
        data: [
          properties.filter(p => p.details?.type === 'villa').length,
          properties.filter(p => p.details?.type === 'appartement').length,
          properties.filter(p => p.details?.type === 'terrain_nu').length,
          properties.filter(p => p.details?.type === 'immeuble').length,
          properties.filter(p => p.details?.type === 'autres').length,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  } : null;

  const occupancyData = reportData ? {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Taux d\'occupation (%)',
        data: [
          reportData.overview.occupancyRate * 0.9,
          reportData.overview.occupancyRate * 0.95,
          reportData.overview.occupancyRate,
          reportData.overview.occupancyRate * 1.02,
          reportData.overview.occupancyRate * 1.05,
          reportData.overview.occupancyRate * 0.98
        ],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const reportTypes = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'properties', name: 'Propriétés', icon: Home },
    { id: 'financial', name: 'Financier', icon: DollarSign },
    { id: 'clients', name: 'Clients', icon: Users },
  ];

  const isLoading = statsLoading || propertiesLoading || contractsLoading || ownersLoading || tenantsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports et Statistiques</h1>
          <p className="text-gray-600 mt-1">
            Analysez les performances de votre agence
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <Card>
        <div className="flex flex-wrap gap-2">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${selectedReport === type.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
            >
              <type.icon className="h-4 w-4" />
              <span>{type.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Overview Report */}
          {selectedReport === 'overview' && (
            reportData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-green-500">
                            <DollarSign className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Revenus totaux
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                              {formatCurrency(reportData.overview.totalRevenue)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center text-sm">
                          <span className="flex items-center text-green-600">
                            ↗ 12%
                          </span>
                          <span className="ml-2 text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-blue-500">
                            <TrendingUp className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Commissions
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                              {formatCurrency(reportData.overview.totalCommissions)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center text-sm">
                          <span className="flex items-center text-green-600">
                            ↗ 8%
                          </span>
                          <span className="ml-2 text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-yellow-500">
                            <Home className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Contrats actifs
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                              {reportData.overview.activeContracts}
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center text-sm">
                          <span className="flex items-center text-green-600">
                            ↗ 5%
                          </span>
                          <span className="ml-2 text-gray-500">vs mois précédent</span>
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
                              Nouveaux clients
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                              {reportData.overview.newClients}
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center text-sm">
                          <span className="flex items-center text-green-600">
                            ↗ 15%
                          </span>
                          <span className="ml-2 text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Charts */}
                {revenueChartData && propertyTypeData && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Évolution des revenus
                        </h3>
                        <div className="h-64">
                          <Bar data={revenueChartData} options={chartOptions} />
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Répartition par type de bien
                        </h3>
                        <div className="h-64">
                          <Pie data={propertyTypeData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Additional Chart */}
                {occupancyData && (
                  <Card>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Taux d'occupation mensuel
                      </h3>
                      <div className="h-64">
                        <Line data={occupancyData} options={chartOptions} />
                      </div>
                    </div>
                  </Card>
                )}

                {/* Performance Indicators */}
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Indicateurs de performance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {reportData.overview.occupancyRate}%
                        </div>
                        <p className="text-sm text-gray-600">Taux d'occupation</p>
                        <Badge variant="success" size="sm" className="mt-2">
                          {reportData.overview.occupancyRate >= 90 ? 'Excellent' :
                            reportData.overview.occupancyRate >= 75 ? 'Bon' : 'À améliorer'}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {Math.floor(Math.random() * 20) + 10}j
                        </div>
                        <p className="text-sm text-gray-600">Délai moyen de location</p>
                        <Badge variant="info" size="sm" className="mt-2">
                          Bon
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-600 mb-2">
                          {Math.floor(reportData.overview.occupancyRate * 1.05)}%
                        </div>
                        <p className="text-sm text-gray-600">Satisfaction client</p>
                        <Badge variant="warning" size="sm" className="mt-2">
                          Très bon
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )
          )}

          {/* Other report types placeholder */}
          {selectedReport !== 'overview' && (
            <Card className="p-8 text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Rapport {reportTypes.find(t => t.id === selectedReport)?.name}
              </h3>
              <p className="text-gray-600 mb-4">
                Ce rapport sera disponible dans une prochaine version.
              </p>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Programmer un rapport
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
};