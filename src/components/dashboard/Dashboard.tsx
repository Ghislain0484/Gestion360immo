/*import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, Users, UserCheck, FileText, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Receipt, Eye, Edit, Printer
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useDashboardStats, useRealtimeData, mapSupabaseError } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { BibleVerseCard } from '../ui/BibleVerse';
import { useAuth } from '../../contexts/AuthContext';
import { Contract, Property, RentReceipt } from '../../types/db';

interface Activity {
  id: string;
  type: 'new_property' | 'new_contract' | 'property_visit' | 'contract_signed';
  title: string;
  description: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}

interface Rental {
  id: string;
  property: string;
  tenant: string;
  dueDate: string;
  amount: string;
  status: 'pending' | 'overdue' | 'upcoming';
}

interface Payment {
  id: string;
  type: 'received' | 'paid';
  tenant: string;
  owner: string;
  property: string;
  amount: number;
  date: string;
  receiptNumber: string;
  status: 'completed';
}

interface GetAllParams {
  agency_id?: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, admin, isLoading: authLoading } = useAuth();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllRentals, setShowAllRentals] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user && !admin) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        Veuillez vous connecter pour accéder au tableau de bord.
      </div>
    );
  }

  // Real-time dashboard stats
  const { stats: dashboardStats, loading: statsLoading, error: statsError } = useDashboardStats();

  // Real-time data
  const { data: recentContracts, initialLoading: contractsLoading, error: contractsError } = useRealtimeData<Contract>(
    (params?: GetAllParams) => dbService.contracts.getAll(params),
    'contracts',
    { agency_id: user?.agency_id ?? undefined }
  );

  const { data: recentProperties, initialLoading: propertiesLoading, error: propertiesError } = useRealtimeData<Property>(
    (params?: GetAllParams) => dbService.properties.getAll(params),
    'properties',
    { agency_id: user?.agency_id ?? undefined }
  );

  const [recentReceipts, setRecentReceipts] = useState<RentReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.agency_id || !Array.isArray(recentContracts)) {
      setRecentReceipts([]);
      setReceiptsLoading(false);
      return;
    }

    const abortController = new AbortController();
    const fetchReceipts = async () => {
      try {
        setReceiptsLoading(true);
        setReceiptsError(null);
        const receipts = await dbService.rentReceipts.getAll({ agency_id: user.agency_id ?? undefined });
        if (!abortController.signal.aborted) {
          setRecentReceipts(receipts);
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        const errMsg = mapSupabaseError(err, 'Erreur chargement rent_receipts');
        setReceiptsError(errMsg);
        setRecentReceipts([]);
      } finally {
        if (!abortController.signal.aborted) setReceiptsLoading(false);
      }
    };

    fetchReceipts();
    return () => abortController.abort();
  }, [user?.agency_id, recentContracts]);

  // Combine errors
  useEffect(() => {
    const errors = [statsError, contractsError, propertiesError, receiptsError].filter(Boolean);
    setError(errors.length > 0 ? errors.join('; ') : null);
  }, [statsError, contractsError, propertiesError, receiptsError]);

  const stats = useMemo(() => dashboardStats ? [
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
      trend: {
        value: dashboardStats.totalContracts > dashboardStats.activeContracts ? 3 : -3,
        isPositive: dashboardStats.totalContracts <= dashboardStats.activeContracts
      },
      color: 'red' as const,
    },
  ] : [], [dashboardStats]);

  const getTimeAgo = (date: string | Date): string => {
    try {
      const now = new Date();
      const past = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(past.getTime())) throw new Error('Invalid date');
      const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

      if (diffInMinutes < 60) return `${diffInMinutes} min`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} h`;
      return `${Math.floor(diffInMinutes / 1440)} j`;
    } catch {
      return 'Inconnu';
    }
  };

  const generateRecentActivities = useMemo((): Activity[] => {
    const activities: Activity[] = [];

    if (Array.isArray(recentProperties)) {
      recentProperties.slice(0, 4).forEach((property: Property) => {
        activities.push({
          id: `prop_${property.id}`,
          type: 'new_property',
          title: 'Nouvelle propriété ajoutée',
          description: `${property.title} - ${property.location?.commune ?? 'Ville non spécifiée'}`,
          time: getTimeAgo(property.created_at),
          status: 'success',
        });
      });
    }

    if (Array.isArray(recentContracts)) {
      recentContracts.slice(0, 4).forEach((contract: Contract) => {
        activities.push({
          id: `contract_${contract.id}`,
          type: 'new_contract',
          title: 'Nouveau contrat signé',
          description: `Contrat ${contract.type} - ${contract.status}`,
          time: getTimeAgo(contract.created_at),
          status: 'success',
        });
      });
    }

    return activities.sort((a, b) => {
      const dateA = new Date(a.time.includes('min') ? Date.now() - parseInt(a.time) * 60 * 1000 : a.time.includes('h') ? Date.now() - parseInt(a.time) * 60 * 60 * 1000 : a.time.includes('j') ? Date.now() - parseInt(a.time) * 24 * 60 * 60 * 1000 : Date.now());
      const dateB = new Date(b.time.includes('min') ? Date.now() - parseInt(b.time) * 60 * 1000 : b.time.includes('h') ? Date.now() - parseInt(b.time) * 60 * 60 * 1000 : b.time.includes('j') ? Date.now() - parseInt(b.time) * 24 * 60 * 60 * 1000 : Date.now());
      return dateB.getTime() - dateA.getTime();
    }).slice(0, 4);
  }, [recentProperties, recentContracts]);

  const generateUpcomingRentals = useMemo((): Rental[] => {
    if (!Array.isArray(recentContracts)) return [];
    return recentContracts
      .filter((contract: Contract) => contract.status === 'active' && contract.monthly_rent)
      .slice(0, 5)
      .map((contract: Contract) => {
        const dueDate = new Date(contract.start_date);
        dueDate.setMonth(dueDate.getMonth() + 1);
        return {
          id: contract.id,
          property: `Propriété #${contract.property_id}`,
          tenant: `Locataire #${contract.tenant_id}`,
          dueDate: dueDate.toISOString().split('T')[0],
          amount: formatCurrency(contract.monthly_rent ?? 0),
          status: dueDate < new Date() ? 'overdue' : 'upcoming',
        };
      });
  }, [recentContracts]);

  const generateRecentPayments = useMemo((): Payment[] => {
    if (!Array.isArray(recentReceipts) || !Array.isArray(recentContracts)) return [];
    return recentReceipts
      .slice(0, 5)
      .map((receipt: RentReceipt) => ({
        id: receipt.id,
        type: 'received',
        tenant: `Locataire #${receipt.contract_id}`,
        owner: `Propriétaire #${recentContracts.find((c: Contract) => c.id === receipt.contract_id)?.owner_id || 'Inconnu'}`,
        property: `Propriété #${recentContracts.find((c: Contract) => c.id === receipt.contract_id)?.property_id || 'Inconnu'}`,
        amount: receipt.total_amount,
        date: new Date(receipt.payment_date || receipt.created_at).toISOString().split('T')[0],
        receiptNumber: receipt.receipt_number,
        status: 'completed',
      }));
  }, [recentReceipts, recentContracts]);

  const formatCurrency = (amount: number | null | undefined): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount ?? 0);
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
        return <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
      case 'info':
        return <TrendingUp className="h-4 w-4 text-blue-500" aria-hidden="true" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
          {error}
        </div>
      )}

      <div className="bg-gradient-soft rounded-xl p-1">
        <BibleVerseCard showRefresh={true} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-1">
          Vue d'ensemble de votre activité immobilière
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <div className="col-span-4 flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : stats.length > 0 ? (
          stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))
        ) : (
          <p className="col-span-4 text-sm text-gray-500">Aucune statistique disponible</p>
        )}
      </div>

      {dashboardStats && (
        <Card className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200 shadow-elegant">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé Financier</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="region" aria-label="Résumé financier">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(dashboardStats.monthlyRevenue)}
                </div>
                <p className="text-sm text-emerald-700 font-medium">Revenus mensuels</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {dashboardStats.occupancyRate}%
                </div>
                <p className="text-sm text-blue-700 font-medium">Taux d'occupation</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {formatCurrency(dashboardStats.monthlyRevenue * 0.1)}
                </div>
                <p className="text-sm text-purple-700 font-medium">Commissions mensuelles</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Activités Récentes
            </h3>
            <Button
              variant="ghost"
              onClick={() => setShowAllActivities(true)}
              aria-label="Voir toutes les activités"
            >
              Voir tout
            </Button>
          </div>

          <div className="space-y-4">
            {propertiesLoading || contractsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : generateRecentActivities.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune activité récente</p>
            ) : (
              generateRecentActivities.map((activity) => (
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
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Loyers à Venir
            </h3>
            <Button
              variant="ghost"
              onClick={() => setShowAllRentals(true)}
              aria-label="Voir tous les loyers à venir"
            >
              Voir tout
            </Button>
          </div>

          <div className="space-y-4">
            {contractsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : generateUpcomingRentals.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun loyer à venir</p>
            ) : (
              generateUpcomingRentals.map((rental) => (
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
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Paiements Récents
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => setShowAllPayments(true)}
              aria-label="Voir tous les paiements récents"
            >
              Voir tout
            </Button>
            <Link to="/receipts">
              <Button variant="outline" size="sm">
                <Receipt className="h-4 w-4 mr-1" />
                Gestion Quittances
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {receiptsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : generateRecentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun paiement récent</p>
          ) : (
            generateRecentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${payment.type === 'received' ? 'bg-green-500' : 'bg-blue-500'
                    }`} aria-hidden="true"></div>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alert('Visualisation non implémentée')}
                      aria-label="Voir les détails du paiement"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alert('Modification non implémentée')}
                      aria-label="Modifier le paiement"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alert('Impression non implémentée')}
                      aria-label="Imprimer le reçu"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Actions Rapides
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/properties')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition-smooth shadow-soft hover:shadow-elegant"
            aria-label="Ajouter une nouvelle propriété"
          >
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Ajouter Propriété</p>
              <p className="text-sm text-gray-500">Nouvelle propriété</p>
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/owners')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl hover:from-emerald-100 hover:to-teal-100 transition-smooth shadow-soft hover:shadow-elegant"
            aria-label="Ajouter un nouveau propriétaire"
          >
            <Users className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nouveau Propriétaire</p>
              <p className="text-sm text-gray-500">Enregistrer</p>
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/tenants')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl hover:from-amber-100 hover:to-yellow-100 transition-smooth shadow-soft hover:shadow-elegant"
            aria-label="Ajouter un nouveau locataire"
          >
            <UserCheck className="h-8 w-8 text-yellow-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nouveau Locataire</p>
              <p className="text-sm text-gray-500">Ajouter</p>
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/contracts')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl hover:from-violet-100 hover:to-purple-100 transition-smooth shadow-soft hover:shadow-elegant"
            aria-label="Créer un nouveau contrat"
          >
            <FileText className="h-8 w-8 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nouveau Contrat</p>
              <p className="text-sm text-gray-500">Créer</p>
            </div>
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={showAllActivities}
        onClose={() => setShowAllActivities(false)}
        title="Toutes les activités"
        size="lg"
      >
        <div className="space-y-4">
          {generateRecentActivities.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune activité disponible</p>
          ) : (
            generateRecentActivities.map((activity) => (
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
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showAllRentals}
        onClose={() => setShowAllRentals(false)}
        title="Tous les loyers à venir"
        size="lg"
      >
        <div className="space-y-3">
          {generateUpcomingRentals.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun loyer à venir</p>
          ) : (
            generateUpcomingRentals.map((rental) => (
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
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showAllPayments}
        onClose={() => setShowAllPayments(false)}
        title="Tous les paiements récents"
        size="lg"
      >
        <div className="space-y-3">
          {generateRecentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun paiement récent</p>
          ) : (
            generateRecentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${payment.type === 'received' ? 'bg-green-500' : 'bg-blue-500'
                    }`} aria-hidden="true"></div>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alert('Visualisation non implémentée')}
                      aria-label="Voir les détails du paiement"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alert('Modification non implémentée')}
                      aria-label="Modifier le paiement"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alert('Impression non implémentée')}
                      aria-label="Imprimer le reçu"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );

};*/

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, Users, UserCheck, FileText, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Receipt, Eye, Edit, Printer
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useDashboardStats, useRealtimeData, mapSupabaseError } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { BibleVerseCard } from '../ui/BibleVerse';
import { useAuth } from '../../contexts/AuthContext';
import { Contract, Property, RentReceipt } from '../../types/db';

interface Activity {
  id: string;
  type: 'new_property' | 'new_contract' | 'property_visit' | 'contract_signed';
  title: string;
  description: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}

interface Rental {
  id: string;
  property: string;
  tenant: string;
  dueDate: string;
  amount: string;
  status: 'pending' | 'overdue' | 'upcoming';
}

interface Payment {
  id: string;
  type: 'received' | 'paid';
  tenant: string;
  owner: string;
  property: string;
  amount: number;
  date: string;
  receiptNumber: string;
  status: 'completed';
}

interface GetAllParams {
  agency_id?: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, admin, isLoading: authLoading } = useAuth();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllRentals, setShowAllRentals] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 border-t-2"></div>
      </div>
    );
  }

  if (!user && !admin) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        Veuillez vous connecter pour accéder au tableau de bord.
      </div>
    );
  }

  // Real-time dashboard stats
  const { stats: dashboardStats, loading: statsLoading, error: statsError } = useDashboardStats();

  // Real-time data
  const { data: recentContracts, initialLoading: contractsLoading, error: contractsError } = useRealtimeData<Contract>(
    (params?: GetAllParams) => dbService.contracts.getAll(params),
    'contracts',
    { agency_id: user?.agency_id ?? undefined }
  );

  const { data: recentProperties, initialLoading: propertiesLoading, error: propertiesError } = useRealtimeData<Property>(
    (params?: GetAllParams) => dbService.properties.getAll(params),
    'properties',
    { agency_id: user?.agency_id ?? undefined }
  );

  const [recentReceipts, setRecentReceipts] = useState<RentReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.agency_id || !Array.isArray(recentContracts)) {
      setRecentReceipts([]);
      setReceiptsLoading(false);
      return;
    }

    const abortController = new AbortController();
    const fetchReceipts = async () => {
      try {
        setReceiptsLoading(true);
        setReceiptsError(null);
        const receipts = await dbService.rentReceipts.getAll({ agency_id: user.agency_id ?? undefined });
        if (!abortController.signal.aborted) {
          setRecentReceipts(receipts);
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        const errMsg = mapSupabaseError(err, 'Erreur chargement rent_receipts');
        setReceiptsError(errMsg);
        setRecentReceipts([]);
      } finally {
        if (!abortController.signal.aborted) setReceiptsLoading(false);
      }
    };

    fetchReceipts();
    return () => abortController.abort();
  }, [user?.agency_id, recentContracts]);

  // Combine errors
  useEffect(() => {
    const errors = [statsError, contractsError, propertiesError, receiptsError].filter(Boolean);
    setError(errors.length > 0 ? errors.join('; ') : null);
  }, [statsError, contractsError, propertiesError, receiptsError]);

  // Move all function definitions here, before useMemo
  const getTimeAgo = (date: string | Date): string => {
    try {
      const now = new Date();
      const past = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(past.getTime())) throw new Error('Invalid date');
      const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

      if (diffInMinutes < 60) return `${diffInMinutes} min`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} h`;
      return `${Math.floor(diffInMinutes / 1440)} j`;
    } catch {
      return 'Inconnu';
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount ?? 0);
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
        return <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
      case 'info':
        return <TrendingUp className="h-4 w-4 text-blue-500" aria-hidden="true" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" aria-hidden="true" />;
    }
  };

  // Now useMemo hooks after function definitions
  const stats = useMemo(() => dashboardStats ? [
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
      trend: {
        value: dashboardStats.totalContracts > dashboardStats.activeContracts ? 3 : -3,
        isPositive: dashboardStats.totalContracts <= dashboardStats.activeContracts
      },
      color: 'red' as const,
    },
  ] : [], [dashboardStats]);

  const generateRecentActivities = useMemo((): Activity[] => {
    const activities: Activity[] = [];

    if (Array.isArray(recentProperties)) {
      recentProperties.slice(0, 4).forEach((property: Property) => {
        activities.push({
          id: `prop_${property.id}`,
          type: 'new_property',
          title: 'Nouvelle propriété ajoutée',
          description: `${property.title} - ${property.location?.commune ?? 'Ville non spécifiée'}`,
          time: getTimeAgo(property.created_at),
          status: 'success',
        });
      });
    }

    if (Array.isArray(recentContracts)) {
      recentContracts.slice(0, 4).forEach((contract: Contract) => {
        activities.push({
          id: `contract_${contract.id}`,
          type: 'new_contract',
          title: 'Nouveau contrat signé',
          description: `Contrat ${contract.type} - ${contract.status}`,
          time: getTimeAgo(contract.created_at),
          status: 'success',
        });
      });
    }

    return activities.sort((a, b) => {
      const dateA = new Date(a.time.includes('min') ? Date.now() - parseInt(a.time) * 60 * 1000 : a.time.includes('h') ? Date.now() - parseInt(a.time) * 60 * 60 * 1000 : a.time.includes('j') ? Date.now() - parseInt(a.time) * 24 * 60 * 60 * 1000 : Date.now());
      const dateB = new Date(b.time.includes('min') ? Date.now() - parseInt(b.time) * 60 * 1000 : b.time.includes('h') ? Date.now() - parseInt(b.time) * 60 * 60 * 1000 : b.time.includes('j') ? Date.now() - parseInt(b.time) * 24 * 60 * 60 * 1000 : Date.now());
      return dateB.getTime() - dateA.getTime();
    }).slice(0, 4);
  }, [recentProperties, recentContracts]);

  const generateUpcomingRentals = useMemo((): Rental[] => {
    if (!Array.isArray(recentContracts)) return [];
    return recentContracts
      .filter((contract: Contract) => contract.status === 'active' && contract.monthly_rent)
      .slice(0, 5)
      .map((contract: Contract) => {
        const dueDate = new Date(contract.start_date);
        dueDate.setMonth(dueDate.getMonth() + 1);
        return {
          id: contract.id,
          property: `Propriété #${contract.property_id}`,
          tenant: `Locataire #${contract.tenant_id}`,
          dueDate: dueDate.toISOString().split('T')[0],
          amount: formatCurrency(contract.monthly_rent ?? 0),
          status: dueDate < new Date() ? 'overdue' : 'upcoming',
        };
      });
  }, [recentContracts]);

  const generateRecentPayments = useMemo((): Payment[] => {
    if (!Array.isArray(recentReceipts) || !Array.isArray(recentContracts)) return [];
    return recentReceipts
      .slice(0, 5)
      .map((receipt: RentReceipt) => ({
        id: receipt.id,
        type: 'received',
        tenant: `Locataire #${receipt.contract_id}`,
        owner: `Propriétaire #${recentContracts.find((c: Contract) => c.id === receipt.contract_id)?.owner_id || 'Inconnu'}`,
        property: `Propriété #${recentContracts.find((c: Contract) => c.id === receipt.contract_id)?.property_id || 'Inconnu'}`,
        amount: receipt.total_amount,
        date: new Date(receipt.payment_date || receipt.created_at).toISOString().split('T')[0],
        receiptNumber: receipt.receipt_number,
        status: 'completed',
      }));
  }, [recentReceipts, recentContracts]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
          {error}
        </div>
      )}

      <div className="bg-gradient-soft rounded-xl p-1">
        <BibleVerseCard showRefresh={true} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-1">
          Vue d'ensemble de votre activité immobilière
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <div className="col-span-4 flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : stats.length > 0 ? (
          stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))
        ) : (
          <p className="col-span-4 text-sm text-gray-500">Aucune statistique disponible</p>
        )}
      </div>

      {dashboardStats && (
        <Card className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200 shadow-elegant">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé Financier</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="region" aria-label="Résumé financier">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(dashboardStats.monthlyRevenue)}
                </div>
                <p className="text-sm text-emerald-700 font-medium">Revenus mensuels</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {dashboardStats.occupancyRate}%
                </div>
                <p className="text-sm text-blue-700 font-medium">Taux d'occupation</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {formatCurrency(dashboardStats.monthlyCommissions)}
                </div>
                <p className="text-sm text-purple-700 font-medium">Commissions mensuelles</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Activités Récentes
            </h3>
            <Button
              variant="ghost"
              onClick={() => setShowAllActivities(true)}
              aria-label="Voir toutes les activités récentes"
            >
              Voir tout
            </Button>
          </div>
          <div className="space-y-3">
            {propertiesLoading || contractsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : generateRecentActivities.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune activité récente</p>
            ) : (
              generateRecentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  {getStatusIcon(activity.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Loyers à Venir
            </h3>
            <Button
              variant="ghost"
              onClick={() => setShowAllRentals(true)}
              aria-label="Voir tous les loyers à venir"
            >
              Voir tout
            </Button>
          </div>
          <div className="space-y-3">
            {contractsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : generateUpcomingRentals.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun loyer à venir</p>
            ) : (
              generateUpcomingRentals.map((rental) => (
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
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Paiements Récents
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => setShowAllPayments(true)}
              aria-label="Voir tous les paiements récents"
            >
              Voir tout
            </Button>
            <Link to="/receipts">
              <Button variant="outline" size="sm">
                <Receipt className="h-4 w-4 mr-1" />
                Gestion Quittances
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {receiptsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : generateRecentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun paiement récent</p>
          ) : (
            generateRecentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${payment.type === 'received' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.type === 'received' ? `Loyer reçu - ${payment.tenant}` : `Reversement - ${payment.owner}`}
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
                    <Button variant="ghost" size="sm" onClick={() => alert('Visualisation non implémentée')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => alert('Modification non implémentée')}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => alert('Impression non implémentée')}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Actions Rapides
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/properties')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition-smooth shadow-soft hover:shadow-elegant"
          >
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Ajouter Propriété</p>
              <p className="text-sm text-gray-500">Nouvelle propriété</p>
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/owners')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl hover:from-emerald-100 hover:to-teal-100 transition-smooth shadow-soft hover:shadow-elegant"
          >
            <Users className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nouveau Propriétaire</p>
              <p className="text-sm text-gray-500">Enregistrer</p>
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/tenants')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl hover:from-amber-100 hover:to-yellow-100 transition-smooth shadow-soft hover:shadow-elegant"
          >
            <UserCheck className="h-8 w-8 text-yellow-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nouveau Locataire</p>
              <p className="text-sm text-gray-500">Ajouter</p>
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/contracts')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl hover:from-violet-100 hover:to-purple-100 transition-smooth shadow-soft hover:shadow-elegant"
          >
            <FileText className="h-8 w-8 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nouveau Contrat</p>
              <p className="text-sm text-gray-500">Créer</p>
            </div>
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={showAllActivities}
        onClose={() => setShowAllActivities(false)}
        title="Toutes les activités"
        size="lg"
      >
        <div className="space-y-4">
          {generateRecentActivities.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune activité disponible</p>
          ) : (
            generateRecentActivities.map((activity) => (
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
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showAllRentals}
        onClose={() => setShowAllRentals(false)}
        title="Tous les loyers à venir"
        size="lg"
      >
        <div className="space-y-3">
          {generateUpcomingRentals.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun loyer à venir</p>
          ) : (
            generateUpcomingRentals.map((rental) => (
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
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showAllPayments}
        onClose={() => setShowAllPayments(false)}
        title="Tous les paiements récents"
        size="lg"
      >
        <div className="space-y-3">
          {generateRecentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun paiement récent</p>
          ) : (
            generateRecentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${payment.type === 'received' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.type === 'received' ? `Loyer reçu - ${payment.tenant}` : `Reversement - ${payment.owner}`}
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
                    <Button variant="ghost" size="sm" onClick={() => alert('Visualisation non implémentée')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => alert('Modification non implémentée')}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => alert('Impression non implémentée')}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
