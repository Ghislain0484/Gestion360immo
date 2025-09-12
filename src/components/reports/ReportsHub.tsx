import React, { useState, useEffect } from 'react';
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
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats, useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { Property, Contract, Owner, Tenant } from '../../types/db';
import { MonthlyRevenueItem } from '../../types/contracts';

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
  //const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number; commissions: number }[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueItem[]>([]);

  const { user } = useAuth();

  // Données réelles de l'agence
  const { stats: dashboardStats, loading: statsLoading, error: statsError } = useDashboardStats();
  const { data: properties, loading: propertiesLoading, error: propertiesError } = useRealtimeData<Property>(
    (params) => dbService.properties.getAll(params),
    'properties',
    { agency_id: user?.agency_id ?? undefined } // Handle null to satisfy TS2322
  );
  const { data: contracts, loading: contractsLoading, error: contractsError } = useRealtimeData<Contract>(
    (params) => dbService.contracts.getAll(params),
    'contracts',
    { agency_id: user?.agency_id ?? undefined } // Handle null
  );
  const { data: owners, loading: ownersLoading, error: ownersError } = useRealtimeData<Owner>(
    (params) => dbService.owners.getAll(params),
    'owners',
    { agency_id: user?.agency_id ?? undefined } // Handle null
  );
  const { data: tenants, loading: tenantsLoading, error: tenantsError } = useRealtimeData<Tenant>(
    (params) => dbService.tenants.getAll(params),
    'tenants',
    { agency_id: user?.agency_id ?? undefined } // Handle null
  );

  // Fetch monthly revenue
  useEffect(() => {
    if (user?.agency_id) {
      dbService.getMonthlyRevenue(user.agency_id)
        .then(setMonthlyRevenue)
        .catch(err => {
          console.error('Erreur chargement revenu mensuel:', err);
          toast.error('Erreur lors du chargement des revenus mensuels');
        });
    }
  }, [user?.agency_id]);

  // Handle errors
  useEffect(() => {
    if (statsError) toast.error(statsError);
    if (propertiesError) toast.error(propertiesError);
    if (contractsError) toast.error(contractsError);
    if (ownersError) toast.error(ownersError);
    if (tenantsError) toast.error(tenantsError);
  }, [statsError, propertiesError, contractsError, ownersError, tenantsError]);

  // Calculs basés sur les vraies données
  const reportData = dashboardStats ? {
    overview: {
      totalRevenue: dashboardStats.monthlyRevenue,
      totalCommissions: monthlyRevenue.length > 0 ? monthlyRevenue[monthlyRevenue.length - 1].commissions : 0,
      activeContracts: dashboardStats.activeContracts,
      newClients: (owners?.length || 0) + (tenants?.length || 0),
      occupancyRate: dashboardStats.occupancyRate,
    },
    properties: {
      totalProperties: properties?.length || 0,
      availableProperties: properties?.filter(p => p.is_available).length || 0,
      rentedProperties: properties?.filter(p => !p.is_available).length || 0,
      soldProperties: contracts?.filter(c => c.type === 'vente').length || 0,
    },
    financial: {
      monthlyRevenue: monthlyRevenue.length > 0 ? monthlyRevenue : [
        { month: 'Jan', revenue: 0, commissions: 0 },
        { month: 'Fév', revenue: 0, commissions: 0 },
        { month: 'Mar', revenue: 0, commissions: 0 },
        { month: 'Avr', revenue: 0, commissions: 0 },
        { month: 'Mai', revenue: 0, commissions: 0 },
        { month: 'Jun', revenue: 0, commissions: 0 },
      ],
    },
  } : null;

  // Calculate growth percentages
  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return Number(((current - previous) / previous * 100).toFixed(1));
  };

  const revenueGrowth = monthlyRevenue.length >= 2
    ? getGrowthPercentage(monthlyRevenue[monthlyRevenue.length - 1].revenue, monthlyRevenue[monthlyRevenue.length - 2].revenue)
    : 0;
  const commissionsGrowth = monthlyRevenue.length >= 2
    ? getGrowthPercentage(monthlyRevenue[monthlyRevenue.length - 1].commissions, monthlyRevenue[monthlyRevenue.length - 2].commissions)
    : 0;
  const contractsGrowth = dashboardStats && dashboardStats.activeContracts > 0
    ? 5 // Placeholder: Calculate from historical contract data
    : 0;
  const clientsGrowth = reportData
    ? getGrowthPercentage(reportData.overview.newClients, reportData.overview.newClients * 0.85) // Placeholder: Use historical client data
    : 0;

  // Chart data
  const revenueChartData = reportData ? {
    labels: reportData.financial.monthlyRevenue.map(m => m.month),
    datasets: [
      {
        label: 'Revenus (FCFA)',
        data: reportData.financial.monthlyRevenue.map(m => m.revenue),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Commissions (FCFA)',
        data: reportData.financial.monthlyRevenue.map(m => m.commissions),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  } : {
    labels: [],
    datasets: [],
  };

  const propertyTypeData = reportData ? {
    labels: ['Villas', 'Appartements', 'Terrains', 'Immeubles', 'Autres'],
    datasets: [
      {
        data: [
          properties?.filter(p => p.details?.type === 'villa').length || 0,
          properties?.filter(p => p.details?.type === 'appartement').length || 0,
          properties?.filter(p => p.details?.type === 'terrain_nu').length || 0,
          properties?.filter(p => p.details?.type === 'immeuble').length || 0,
          properties?.filter(p => p.details?.type === 'autres').length || 0,
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
  } : {
    labels: [],
    datasets: [],
  };

  const occupancyData = reportData ? {
    labels: reportData.financial.monthlyRevenue.map(m => m.month),
    datasets: [
      {
        label: 'Taux d\'occupation (%)',
        data: reportData.financial.monthlyRevenue.map((_, i) => reportData.overview.occupancyRate * (0.9 + i * 0.02)),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  } : {
    labels: [],
    datasets: [],
  };

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
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                selectedReport === type.id
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
                          <span className={`flex items-center ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {revenueGrowth >= 0 ? '↗' : '↘'} {Math.abs(revenueGrowth)}%
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
                          <span className={`flex items-center ${commissionsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {commissionsGrowth >= 0 ? '↗' : '↘'} {Math.abs(commissionsGrowth)}%
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
                          <span className={`flex items-center ${contractsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {contractsGrowth >= 0 ? '↗' : '↘'} {Math.abs(contractsGrowth)}%
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
                          <span className={`flex items-center ${clientsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {clientsGrowth >= 0 ? '↗' : '↘'} {Math.abs(clientsGrowth)}%
                          </span>
                          <span className="ml-2 text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Charts */}
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

                {/* Additional Chart */}
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
                        <Badge variant={reportData.overview.occupancyRate >= 90 ? 'success' : reportData.overview.occupancyRate >= 75 ? 'info' : 'warning'} size="sm" className="mt-2">
                          {reportData.overview.occupancyRate >= 90 ? 'Excellent' : reportData.overview.occupancyRate >= 75 ? 'Bon' : 'À améliorer'}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          -j
                        </div>
                        <p className="text-sm text-gray-600">Délai moyen de location</p>
                        <Badge variant="info" size="sm" className="mt-2">
                          À calculer
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-600 mb-2">
                          -%
                        </div>
                        <p className="text-sm text-gray-600">Satisfaction client</p>
                        <Badge variant="warning" size="sm" className="mt-2">
                          À calculer
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