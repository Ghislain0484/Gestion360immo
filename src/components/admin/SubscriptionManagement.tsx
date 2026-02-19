import React, { useState } from 'react';
import { DollarSign, Calendar, AlertTriangle, CheckCircle, CreditCard, Ban, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import {
  useAgencies,
  useToggleAgencyStatus,
  useExtendSubscription,
  useUpdateAgencyPlan,
  usePlatformSettings
} from '../../hooks/useAdminQueries';
import { Agency } from '../../types/db';

interface ExtendModalData {
  agency: Agency;
  months: string;
}

export const SubscriptionManagement: React.FC = () => {
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [monthsToExtend, setMonthsToExtend] = useState('1');
  const [suspensionReason, setSuspensionReason] = useState('');

  // React Query hooks
  const { data: agencies = [], isLoading, error, refetch } = useAgencies();
  const { data: settings } = usePlatformSettings();
  const toggleStatus = useToggleAgencyStatus();
  const extendSubscription = useExtendSubscription();
  const updatePlan = useUpdateAgencyPlan();

  // Calculs dérivés
  const activeAgencies = agencies.filter((a) => a.subscription_status === 'active');
  const suspendedAgencies = agencies.filter((a) => a.subscription_status === 'suspended');
  const totalMonthlyRevenue = activeAgencies.reduce((sum, a) => sum + (a.monthly_fee || 0), 0);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const actualStatus = status || 'active';
    const variants: Record<string, any> = {
      active: { variant: 'success', label: 'Actif' },
      suspended: { variant: 'danger', label: 'Suspendu' },
      trial: { variant: 'warning', label: 'Essai' },
      cancelled: { variant: 'secondary', label: 'Annulé' },
    };
    const config = variants[actualStatus] || variants.active;
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const getPlanLabel = (plan: string | null | undefined): string => {
    const actualPlan = plan || 'basic';
    const labels: Record<string, string> = {
      basic: 'Basique',
      premium: 'Premium',
      enterprise: 'Entreprise',
    };
    return labels[actualPlan] || actualPlan;
  };

  const handleExtend = (agency: Agency) => {
    setSelectedAgency(agency);
    setShowExtendModal(true);
  };

  const handleSuspend = (agency: Agency) => {
    setSelectedAgency(agency);
    setShowSuspendModal(true);
  };

  const handleActivate = (agency: Agency) => {
    toggleStatus.mutate({
      id: agency.id,
      currentStatus: agency.subscription_status
    });
  };

  const confirmExtend = () => {
    if (!selectedAgency) return;

    const months = parseInt(monthsToExtend, 10);
    if (isNaN(months) || months < 1 || months > 12) {
      return;
    }

    extendSubscription.mutate(
      { agencyId: selectedAgency.id, months },
      {
        onSuccess: () => {
          setShowExtendModal(false);
          setSelectedAgency(null);
          setMonthsToExtend('1');
        },
      }
    );
  };

  const confirmSuspend = () => {
    if (!selectedAgency || !suspensionReason.trim()) return;

    toggleStatus.mutate(
      { id: selectedAgency.id, currentStatus: 'active' },
      {
        onSuccess: () => {
          setShowSuspendModal(false);
          setSelectedAgency(null);
          setSuspensionReason('');
        },
      }
    );
  };

  const plans = [
    {
      id: 'basic',
      name: 'Basique',
      price: settings?.subscription_basic_price || 25000,
      features: ['Jusqu\'à 50 propriétés', 'Support email', 'Rapports basiques'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: settings?.subscription_premium_price || 35000,
      features: ['Propriétés illimitées', 'Support prioritaire', 'Rapports avancés', 'Collaboration'],
    },
    {
      id: 'enterprise',
      name: 'Entreprise',
      price: settings?.subscription_enterprise_price || 50000,
      features: ['Tout Premium +', 'API personnalisée', 'Support dédié', 'Formation'],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
          <p className="text-gray-600 mb-4">Impossible de charger les abonnements</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gestion des Abonnements</h2>
        <div className="flex items-center space-x-3">
          <Badge variant="success" size="sm">
            {formatCurrency(totalMonthlyRevenue)} / mois
          </Badge>
          {suspendedAgencies.length > 0 && (
            <Badge variant="danger" size="sm">
              {suspendedAgencies.length} suspendu{suspendedAgencies.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {formatCurrency(totalMonthlyRevenue)}
            </div>
            <p className="text-sm text-gray-600">Revenus mensuels récurrents</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {activeAgencies.length}
            </div>
            <p className="text-sm text-gray-600">Abonnements actifs</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600 mb-2">
              {suspendedAgencies.length}
            </div>
            <p className="text-sm text-gray-600">Abonnements suspendus</p>
          </div>
        </Card>
      </div>

      {/* Plans Pricing */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plans d'abonnement</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{plan.name}</h4>
                <div className="text-2xl font-bold text-gray-900 mb-3">
                  {formatCurrency(plan.price)}
                  <span className="text-sm font-normal text-gray-500">/mois</span>
                </div>
                <ul className="space-y-1 text-sm text-gray-600">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Subscriptions List */}
      {agencies.length > 0 ? (
        <div className="space-y-4">
          {agencies.map((agency) => (
            <Card key={agency.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{agency.name}</h3>
                    <p className="text-sm text-gray-500">
                      Plan {getPlanLabel(agency.plan_type)} -{' '}
                      {formatCurrency(agency.monthly_fee || 0)}/mois
                    </p>
                  </div>
                  {getStatusBadge(agency.subscription_status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Ville</p>
                    <p className="font-medium">{agency.city}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{agency.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date d'inscription</p>
                    <p className="font-medium">
                      {new Date(agency.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    {agency.subscription_status === 'suspended' && (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span>Abonnement suspendu</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExtend(agency)}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Étendre
                    </Button>
                    {agency.subscription_status === 'active' ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleSuspend(agency)}
                        isLoading={toggleStatus.isPending}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspendre
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleActivate(agency)}
                        isLoading={toggleStatus.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Activer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun abonnement</h3>
          <p className="text-gray-600">Les abonnements des agences apparaîtront ici.</p>
        </Card>
      )}

      {/* Extend Modal */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => {
          setShowExtendModal(false);
          setSelectedAgency(null);
          setMonthsToExtend('1');
        }}
        title="Étendre l'abonnement"
        size="md"
      >
        {selectedAgency && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{selectedAgency.name}</h4>
              <p className="text-sm text-gray-600">
                Plan {getPlanLabel(selectedAgency.plan_type)} -{' '}
                {formatCurrency(selectedAgency.monthly_fee || 0)}/mois
              </p>
            </div>

            <Input
              label="Nombre de mois à ajouter"
              type="number"
              min="1"
              max="12"
              value={monthsToExtend}
              onChange={(e) => setMonthsToExtend(e.target.value)}
            />

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                L'abonnement sera étendu de {monthsToExtend} mois.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowExtendModal(false);
                  setSelectedAgency(null);
                  setMonthsToExtend('1');
                }}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={confirmExtend}
                isLoading={extendSubscription.isPending}
              >
                Confirmer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Suspend Modal */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false);
          setSelectedAgency(null);
          setSuspensionReason('');
        }}
        title="Suspendre l'abonnement"
        size="md"
      >
        {selectedAgency && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{selectedAgency.name}</h4>
              <p className="text-sm text-gray-600">
                Plan {getPlanLabel(selectedAgency.plan_type)}
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                L'agence perdra l'accès à la plateforme jusqu'à la réactivation.
              </p>
            </div>

            <Input
              label="Raison de la suspension"
              placeholder="Ex: Non-paiement depuis 15 jours"
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
            />

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedAgency(null);
                  setSuspensionReason('');
                }}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={confirmSuspend}
                isLoading={toggleStatus.isPending}
                disabled={!suspensionReason.trim()}
              >
                Confirmer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};