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
import { BarChart3, PieChart, TrendingUp, Download, Calendar, DollarSign, Home, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

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

  // Mock data for reports
  const reportData = {
    overview: {
      totalRevenue: 2450000,
      totalCommissions: 245000,
      activeContracts: 45,
      newClients: 12,
      occupancyRate: 87.5
    },
    properties: {
      totalProperties: 67,
      availableProperties: 12,
      rentedProperties: 45,
      soldProperties: 10
    },
    financial: {
      monthlyRevenue: [
        { month: 'Jan', revenue: 1800000, commissions: 180000 },
        { month: 'Fév', revenue: 2100000, commissions: 210000 },
        { month: 'Mar', revenue: 2450000, commissions: 245000 }
      ]
    }
  };

  // Chart data
  const revenueChartData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Revenus (FCFA)',
        data: [1800000, 2100000, 2450000, 2200000, 2600000, 2800000],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Commissions (FCFA)',
        data: [180000, 210000, 245000, 220000, 260000, 280000],
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  const propertyTypeData = {
    labels: ['Villas', 'Appartements', 'Terrains', 'Immeubles', 'Autres'],
    datasets: [
      {
        data: [45, 35, 10, 7, 3],
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
  };

  const occupancyData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Taux d\'occupation (%)',
        data: [85, 87, 89, 88, 91, 87],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
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

      {/* Overview Report */}
      {selectedReport === 'overview' && (
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

          {/* Charts Placeholder */}
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
                  <Badge variant="success" size="sm" className="mt-2">
                    Excellent
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    15j
                  </div>
                  <p className="text-sm text-gray-600">Délai moyen de location</p>
                  <Badge variant="info" size="sm" className="mt-2">
                    Bon
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    92%
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
    </div>
  );
};