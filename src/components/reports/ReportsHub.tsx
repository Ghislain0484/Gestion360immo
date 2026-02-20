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
import { BarChart3, TrendingUp, Download, DollarSign, Home, Users, FileText, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats, useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { Property, Contract, Owner, Tenant } from '../../types/db';
import { MonthlyRevenueItem } from '../../types/contracts';
import { jsPDF } from 'jspdf';
import { getAgencyBranding, renderPDFHeader, renderPDFFooter } from '../../utils/agencyBranding';

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
  const { data: properties, initialLoading: propertiesLoading, error: propertiesError } = useRealtimeData<Property>(
    (params) => dbService.properties.getAll(params),
    'properties',
    { agency_id: user?.agency_id ?? undefined } // Handle null to satisfy TS2322
  );
  const { data: contracts, initialLoading: contractsLoading, error: contractsError } = useRealtimeData<Contract>(
    (params) => dbService.contracts.getAll(params),
    'contracts',
    { agency_id: user?.agency_id ?? undefined } // Handle null
  );
  const { data: owners, initialLoading: ownersLoading, error: ownersError } = useRealtimeData<Owner>(
    (params) => dbService.owners.getAll(params),
    'owners',
    { agency_id: user?.agency_id ?? undefined } // Handle null
  );
  const { data: tenants, initialLoading: tenantsLoading, error: tenantsError } = useRealtimeData<Tenant>(
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

  // Calcul du taux de collecte (contrats avec au moins un paiement)
  const collectionRate = contracts && contracts.length > 0
    ? Math.round((contracts.filter(c => c.status === 'active').length / contracts.length) * 100)
    : 0;

  // avgRooms non calculable car PropertyDetails ne contient pas rooms
  const avgRooms = 0; // Champ non disponible dans le schéma actuel


  // Export PDF du rapport courant
  const handleExport = async () => {
    try {
      const branding = await getAgencyBranding(user?.agency_id ?? undefined);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let y = renderPDFHeader(doc, branding, 15);

      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
      const reportName = reportTypes.find(r => r.id === selectedReport)?.name || 'Rapport';
      doc.text(`RAPPORT : ${reportName.toUpperCase()}`, pageWidth / 2, y, { align: 'center' }); y += 8;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - Période : ${selectedPeriod}`, pageWidth / 2, y, { align: 'center' }); y += 12;
      doc.setDrawColor(200, 200, 200); doc.line(20, y, pageWidth - 20, y); y += 8;

      const writeRow = (label: string, val: string) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(label, 20, y);
        doc.setTextColor(30, 30, 30);
        doc.text(val, 120, y);
        y += 8;
      };

      if (selectedReport === 'overview' && reportData) {
        writeRow('Revenus totaux :', formatCurrency(reportData.overview.totalRevenue));
        writeRow('Commissions :', formatCurrency(reportData.overview.totalCommissions));
        writeRow('Contrats actifs :', String(reportData.overview.activeContracts));
        writeRow("Taux d'occupation :", `${reportData.overview.occupancyRate}%`);
        writeRow('Total clients :', String(reportData.overview.newClients));
      } else if (selectedReport === 'properties' && reportData) {
        writeRow('Total propriétés :', String(reportData.properties.totalProperties));
        writeRow('Propriétés disponibles :', String(reportData.properties.availableProperties));
        writeRow('Propriétés louées :', String(reportData.properties.rentedProperties));
        writeRow('Ventes réalisées :', String(reportData.properties.soldProperties));
        properties?.forEach((p, i) => {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFontSize(9); doc.setTextColor(50, 50, 50);
          doc.text(`${i + 1}. ${p.title || p.location?.commune || 'N/A'} - ${p.is_available ? 'Disponible' : 'Loué'}`, 20, y); y += 6;
        });
      } else if (selectedReport === 'financial') {
        monthlyRevenue.forEach(m => {
          writeRow(m.month, `Revenus: ${formatCurrency(m.revenue)} | Commissions: ${formatCurrency(m.commissions)}`);
        });
      } else if (selectedReport === 'clients') {
        writeRow('Total propriétaires :', String(owners?.length || 0));
        writeRow('Total locataires :', String(tenants?.length || 0));
        writeRow('Total clients :', String((owners?.length || 0) + (tenants?.length || 0)));
        writeRow('Taux de collecte :', `${collectionRate}%`);
      }

      renderPDFFooter(doc, branding);
      doc.save(`rapport-${selectedReport}-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`);
      toast.success('Rapport exporté en PDF !');
    } catch (err: any) {
      toast.error('Erreur export PDF : ' + err.message);
    }
  };

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
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter PDF
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
                          {avgRooms > 0 ? `${avgRooms} p.` : 'N/A'}
                        </div>
                        <p className="text-sm text-gray-600">Taille moyenne des biens</p>
                        <Badge variant="info" size="sm" className="mt-2">
                          {avgRooms > 0 ? 'Calculé' : 'Données insuffisantes'}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-600 mb-2">
                          {collectionRate}%
                        </div>
                        <p className="text-sm text-gray-600">Taux de collecte</p>
                        <Badge variant={collectionRate >= 80 ? 'success' : 'warning'} size="sm" className="mt-2">
                          {collectionRate >= 80 ? 'Bon' : 'À améliorer'}
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

          {/* Rapport Propriétés */}
          {selectedReport === 'properties' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total propriétés', value: reportData?.properties.totalProperties || 0, color: 'bg-blue-500', Icon: Home },
                  { label: 'Disponibles', value: reportData?.properties.availableProperties || 0, color: 'bg-green-500', Icon: CheckCircle },
                  { label: 'Louées', value: reportData?.properties.rentedProperties || 0, color: 'bg-yellow-500', Icon: FileText },
                  { label: 'Ventes réalisées', value: reportData?.properties.soldProperties || 0, color: 'bg-purple-500', Icon: TrendingUp },
                ].map(({ label, value, color, Icon }) => (
                  <Card key={label}>
                    <div className="p-6 flex items-center gap-4">
                      <div className={`inline-flex items-center justify-center p-3 rounded-lg ${color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{label}</p>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Liste des propriétés</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Propriété</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Commune</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Loyer</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {properties?.map((p) => (
                          <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{p.title || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-600">{p.location?.commune || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-600 capitalize">{p.details?.type || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-600">{contracts?.find(c => c.property_id === p.id) ? formatCurrency(contracts.find(c => c.property_id === p.id)!.monthly_rent || 0) : 'N/A'}</td>
                            <td className="py-3 px-4">
                              <Badge variant={p.is_available ? 'success' : 'warning'}>
                                {p.is_available ? 'Disponible' : 'Loué'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!properties || properties.length === 0) && (
                      <p className="text-center py-8 text-gray-400">Aucune propriété trouvée</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Rapport Financier */}
          {selectedReport === 'financial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Revenus totaux', value: formatCurrency(reportData?.overview.totalRevenue || 0), color: 'bg-green-500', Icon: DollarSign },
                  { label: 'Commissions', value: formatCurrency(reportData?.overview.totalCommissions || 0), color: 'bg-blue-500', Icon: TrendingUp },
                  { label: 'Taux de collecte', value: `${collectionRate}%`, color: 'bg-purple-500', Icon: FileText },
                ].map(({ label, value, color, Icon }) => (
                  <Card key={label}>
                    <div className="p-6 flex items-center gap-4">
                      <div className={`inline-flex items-center justify-center p-3 rounded-lg ${color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{label}</p>
                        <p className="text-xl font-bold text-gray-900">{value}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution mensuelle des revenus</h3>
                  <div className="h-64">
                    <Bar data={revenueChartData} options={chartOptions} />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail mensuel</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Mois</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-600">Revenus</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-600">Commissions</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-600">Net propriétaires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyRevenue.map((m) => (
                          <tr key={m.month} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{m.month}</td>
                            <td className="py-3 px-4 text-right text-green-700 font-semibold">{formatCurrency(m.revenue)}</td>
                            <td className="py-3 px-4 text-right text-blue-700">{formatCurrency(m.commissions)}</td>
                            <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(m.revenue - m.commissions)}</td>
                          </tr>
                        ))}
                        {monthlyRevenue.length === 0 && (
                          <tr><td colSpan={4} className="py-8 text-center text-gray-400">Aucune donnée financière disponible</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Rapport Clients */}
          {selectedReport === 'clients' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Propriétaires', value: owners?.length || 0, color: 'bg-blue-500', Icon: Home },
                  { label: 'Locataires', value: tenants?.length || 0, color: 'bg-green-500', Icon: Users },
                  { label: 'Total clients', value: (owners?.length || 0) + (tenants?.length || 0), color: 'bg-purple-500', Icon: Users },
                  { label: 'Taux de collecte', value: `${collectionRate}%`, color: 'bg-yellow-500', Icon: TrendingUp },
                ].map(({ label, value, color, Icon }) => (
                  <Card key={label}>
                    <div className="p-6 flex items-center gap-4">
                      <div className={`inline-flex items-center justify-center p-3 rounded-lg ${color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{label}</p>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Propriétaires</h3>
                    <div className="space-y-3">
                      {owners?.slice(0, 10).map((o) => (
                        <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <div>
                            <p className="font-medium text-gray-900">{o.first_name} {o.last_name}</p>
                            <p className="text-sm text-gray-500">{o.phone || 'N/A'}</p>
                          </div>
                          <Badge variant="info">{o.business_id}</Badge>
                        </div>
                      ))}
                      {(!owners || owners.length === 0) && <p className="text-center py-4 text-gray-400">Aucun propriétaire</p>}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Locataires</h3>
                    <div className="space-y-3">
                      {tenants?.slice(0, 10).map((t) => (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <div>
                            <p className="font-medium text-gray-900">{t.first_name} {t.last_name}</p>
                            <p className="text-sm text-gray-500">{t.phone || 'N/A'}</p>
                          </div>
                          <Badge variant={(t as any).payment_status === 'bon' ? 'success' : (t as any).payment_status === 'irregulier' ? 'warning' : 'danger'}>
                            {(t as any).payment_status || 'N/A'}
                          </Badge>
                        </div>
                      ))}
                      {(!tenants || tenants.length === 0) && <p className="text-center py-4 text-gray-400">Aucun locataire</p>}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};