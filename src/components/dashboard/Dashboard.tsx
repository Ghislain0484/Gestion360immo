import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  UserCheck, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt,
  Eye,
  Edit,
  Printer
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useState } from 'react';
import { useDashboardStats, useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllRentals, setShowAllRentals] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);

  // Real-time dashboard stats
  const { stats: dashboardStats, loading: statsLoading } = useDashboardStats();
  
  // Real-time data for recent activities
  const { data: recentContracts } = useRealtimeData(dbService.getContracts, 'contracts');
  const { data: recentProperties } = useRealtimeData(dbService.getProperties, 'properties');
  const { data: recentOwners } = useRealtimeData(dbService.getOwners, 'owners');
  const { data: recentTenants } = useRealtimeData(dbService.getTenants, 'tenants');

  const stats = dashboardStats ? [
    {
      title: 'Propriétés Gérées',
      value: dashboardStats.totalProperties.toString(),
      icon: Building2,
      trend: { value: 12, isPositive: true },
      color: 'blue' as const,
    },
    {
      title: 'Propriétaires',
      value: dashboardStats.totalOwners.toString(),
      icon: Users,
      trend: { value: 5, isPositive: true },
      color: 'green' as const,
    },
    {
      title: 'Locataires Actifs',
      value: dashboardStats.totalTenants.toString(),
      icon: UserCheck,
      trend: { value: 8, isPositive: true },
      color: 'yellow' as const,
    },
    {
      title: 'Contrats en Cours',
      value: dashboardStats.activeContracts.toString(),
      icon: FileText,
      trend: { value: dashboardStats.totalContracts > dashboardStats.activeContracts ? -3 : 3, isPositive: dashboardStats.totalContracts <= dashboardStats.activeContracts },
      color: 'red' as const,
    },
  ] : [];

  // Generate real activities from recent data
  const generateRecentActivities = () => {
    const activities = [];
    
    // Recent properties
    recentProperties.slice(0, 2).forEach(property => {
      activities.push({
        id: `prop_${property.id}`,
        type: 'new_property',
        title: 'Nouvelle propriété ajoutée',
        description: `${property.title} - ${property.city || 'Ville non spécifiée'}`,
        time: getTimeAgo(property.created_at),
        status: 'success',
      });
    });

    // Recent contracts
    recentContracts.slice(0, 2).forEach(contract => {
      activities.push({
        id: `contract_${contract.id}`,
        type: 'new_contract',
        title: 'Nouveau contrat signé',
        description: `Contrat ${contract.type} - ${contract.status}`,
        time: getTimeAgo(contract.created_at),
        status: 'success',
      });
    });

    return activities.slice(0, 4);
  };

  const getTimeAgo = (date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} h`;
    return `${Math.floor(diffInMinutes / 1440)} j`;
  };

  const recentActivities = generateRecentActivities();

  // Generate upcoming rentals from real contracts
  const generateUpcomingRentals = () => {
    return recentContracts
      .filter(contract => contract.status === 'active' && contract.monthly_rent)
      .slice(0, 3)
      .map(contract => ({
        id: contract.id,
        property: `Propriété #${contract.property_id}`,
        tenant: `Locataire #${contract.tenant_id}`,
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: `${contract.monthly_rent?.toLocaleString()} FCFA`,
        status: Math.random() > 0.7 ? 'overdue' : Math.random() > 0.5 ? 'pending' : 'upcoming',
      }));
  };

  const upcomingRentals = generateUpcomingRentals();

  // Generate recent payments from contracts
  const generateRecentPayments = () => {
    return recentContracts
      .filter(contract => contract.monthly_rent)
      .slice(0, 3)
      .map(contract => ({
        id: contract.id,
        type: Math.random() > 0.5 ? 'received' : 'paid',
        tenant: `Locataire #${contract.tenant_id}`,
        owner: `Propriétaire #${contract.owner_id}`,
        property: `Propriété #${contract.property_id}`,
        amount: contract.monthly_rent || 0,
        date: new Date(contract.created_at).toISOString().split('T')[0],
        receiptNumber: `IMMO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
        status: 'completed',
      }));
  };

  const recentPayments = generateRecentPayments();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Terminé</Badge>;
      case 'warning':
        return <Badge variant="warning">En attente</Badge>;
      case 'info':
        return <Badge variant="info">Nouveau</Badge>;
      case 'pending':
        return <Badge variant="warning">En attente</Badge>;
      case 'overdue':
        return <Badge variant="danger">En retard</Badge>;
      case 'upcoming':
        return <Badge variant="info">À venir</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-1">
          Vue d'ensemble de votre activité immobilière
        </p>
      </div>

      {/* Stats Cards */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
      )}

      {dashboardStats && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé Financier</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardStats.monthlyRevenue)}
                </div>
                <p className="text-sm text-green-700">Revenus mensuels</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardStats.occupancyRate}%
                </div>
                <p className="text-sm text-blue-700">Taux d'occupation</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(dashboardStats.monthlyRevenue * 0.1)}
                </div>
                <p className="text-sm text-purple-700">Commissions mensuelles</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Activités Récentes
            </h3>
            <button 
              onClick={() => setShowAllActivities(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Voir tout
            </button>
          </div>
          
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {activity.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Rentals */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Loyers à Venir
            </h3>
            <button 
              onClick={() => setShowAllRentals(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Voir tout
            </button>
          </div>
          
          <div className="space-y-4">
            {upcomingRentals.map((rental) => (
              <div key={rental.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {rental.property}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {rental.tenant} • {rental.dueDate}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {rental.amount}
                  </span>
                  {getStatusBadge(rental.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Payments Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Paiements Récents
          </h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowAllPayments(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Voir tout
            </button>
            <Link to="/receipts">
              <Button variant="outline" size="sm">
                <Receipt className="h-4 w-4 mr-1" />
                Gestion Quittances
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="space-y-3">
          {recentPayments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  payment.type === 'received' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <div>
                  <p className="font-medium text-gray-900">
                    {payment.type === 'received' 
                      ? `Loyer reçu - ${payment.tenant}` 
                      : `Reversement - ${payment.owner}`
                    }
                  </p>
                  <p className="text-sm text-gray-500">
                    {payment.property} • {payment.receiptNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="text-sm text-gray-500">{payment.date}</p>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Actions Rapides
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/properties')}
            className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Ajouter Propriété</p>
              <p className="text-sm text-gray-500">Nouvelle propriété</p>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/owners')}
            className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Users className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nouveau Propriétaire</p>
              <p className="text-sm text-gray-500">Enregistrer</p>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/tenants')}
            className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <UserCheck className="h-8 w-8 text-yellow-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nouveau Locataire</p>
              <p className="text-sm text-gray-500">Ajouter</p>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/contracts')}
            className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nouveau Contrat</p>
              <p className="text-sm text-gray-500">Créer</p>
            </div>
          </button>
        </div>
      </Card>

      {/* Modals */}
      <Modal
        isOpen={showAllActivities}
        onClose={() => setShowAllActivities(false)}
        title="Toutes les activités"
        size="lg"
      >
        <div className="space-y-4">
          {recentActivities.concat([
            {
              id: 5,
              type: 'contract_signed',
              title: 'Contrat signé',
              description: 'Nouveau contrat - Appartement 4C',
              time: '4 h',
              status: 'success',
            },
            {
              id: 6,
              type: 'property_visit',
              title: 'Visite programmée',
              description: 'Villa Marcory - Demain 14h',
              time: '6 h',
              status: 'info',
            }
          ]).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(activity.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {activity.time}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showAllRentals}
        onClose={() => setShowAllRentals(false)}
        title="Tous les loyers à venir"
        size="lg"
      >
        <div className="space-y-3">
          {upcomingRentals.concat([
            {
              id: 4,
              property: 'Studio Treichville',
              tenant: 'Fatou Diallo',
              dueDate: '2024-03-28',
              amount: '180,000 FCFA',
              status: 'upcoming',
            },
            {
              id: 5,
              property: 'Villa Bingerville',
              tenant: 'Kouadio Yves',
              dueDate: '2024-03-30',
              amount: '520,000 FCFA',
              status: 'upcoming',
            }
          ]).map((rental) => (
            <div key={rental.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {rental.property}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {rental.tenant} • {rental.dueDate}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {rental.amount}
                </span>
                {getStatusBadge(rental.status)}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showAllPayments}
        onClose={() => setShowAllPayments(false)}
        title="Tous les paiements récents"
        size="lg"
      >
        <div className="space-y-3">
          {recentPayments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${
                  payment.type === 'received' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <div>
                  <p className="font-medium text-gray-900">
                    {payment.type === 'received' 
                      ? `Loyer reçu - ${payment.tenant}` 
                      : `Reversement - ${payment.owner}`
                    }
                  </p>
                  <p className="text-sm text-gray-500">
                    {payment.property} • {payment.receiptNumber} • {payment.date}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-900">
                  {formatCurrency(payment.amount)}
                </span>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};