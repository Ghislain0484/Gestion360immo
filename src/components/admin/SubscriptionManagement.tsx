import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Calendar, AlertTriangle, CheckCircle, CreditCard, Ban } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { dbService } from '../../lib/supabase';
import { AgencySubscription, AuditLog } from '../../types/db';
import { BadgeVariant, SubscriptionStatus, PlanType } from '../../types/enums';
import { useAuth } from '../../contexts/AuthContext';

interface Plan {
  id: PlanType;
  name: string;
  price: number;
  features: string[];
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export const SubscriptionManagement: React.FC = () => {
  const { admin, isLoading: authLoading } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedSubscription, setSelectedSubscription] = useState<
    (AgencySubscription & { action?: 'extend' | 'suspend' | 'activate' }) | null
  >(null);
  const [subscriptions, setSubscriptions] = useState<AgencySubscription[]>([]);
  const [agencyNames, setAgencyNames] = useState<{ [key: string]: string }>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [monthsToExtend, setMonthsToExtend] = useState<string>('1');
  const [suspensionReason, setSuspensionReason] = useState<string>('');
  const [toast, setToast] = useState<Toast | null>(null);

  // Toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Log audit action
  const logAudit = useCallback(async (action: string, tableName: string, recordId: string | null, oldValues: any, newValues: any) => {
    try {
      const auditLog: Partial<AuditLog> = {
        user_id: admin?.id ?? null,
        action,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: 'unknown', // Replace with actual IP if available
        user_agent: navigator.userAgent,
      };
      await dbService.auditLogs.getAll(); // Placeholder; add insert method if needed
    } catch (err) {
      console.error('Erreur lors de l’enregistrement de l’audit:', err);
    }
  }, [admin]);

  // Fetch subscriptions, agency names, and plan prices
  const fetchSubscriptions = useCallback(async () => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé. Veuillez vous connecter en tant qu’administrateur.');
      showToast('Accès non autorisé', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [subscriptionsData, settingsData, agencies] = await Promise.all([
        dbService.agencySubscriptions.getAll(),
        dbService.platformSettings.getAll(),
        dbService.agencies.getAll(),
      ]);
      const settingsMap = settingsData.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as { [key: string]: any });

      setPlans([
        {
          id: 'basic' as PlanType,
          name: 'Basique',
          price: Number(settingsMap['subscription_basic_price']) || 25000,
          features: ['Jusqu’à 50 propriétés', 'Support email', 'Rapports basiques'],
        },
        {
          id: 'premium' as PlanType,
          name: 'Premium',
          price: Number(settingsMap['subscription_premium_price']) || 50000,
          features: ['Propriétés illimitées', 'Support prioritaire', 'Rapports avancés', 'Collaboration inter-agences'],
        },
        {
          id: 'enterprise' as PlanType,
          name: 'Entreprise',
          price: Number(settingsMap['subscription_enterprise_price']) || 100000,
          features: ['Tout Premium +', 'API personnalisée', 'Support dédié', 'Formation sur site'],
        },
      ]);

      setSubscriptions(subscriptionsData);
      const names = agencies.reduce((acc, agency) => {
        acc[agency.id] = agency.name;
        return acc;
      }, {} as { [key: string]: string });
      setAgencyNames(names);
    } catch (err: any) {
      console.error('Erreur lors du chargement des abonnements:', err);
      const errorMessage = err.message || 'Erreur lors du chargement des abonnements';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [admin, showToast]);

  useEffect(() => {
    if (authLoading) return;
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé. Veuillez vous connecter en tant qu’administrateur.');
      showToast('Accès non autorisé', 'error');
      return;
    }
    fetchSubscriptions();
  }, [fetchSubscriptions, admin, authLoading]);

  const getStatusColor = (status: SubscriptionStatus): BadgeVariant => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'danger';
      case 'trial':
        return 'warning';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: SubscriptionStatus): string => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'suspended':
        return 'Suspendu';
      case 'trial':
        return 'Essai';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getPlanLabel = (plan: PlanType): string => {
    switch (plan) {
      case 'basic':
        return 'Basique';
      case 'premium':
        return 'Premium';
      case 'enterprise':
        return 'Entreprise';
      default:
        return plan;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePaymentAction = useCallback(
    (subscription: AgencySubscription, action: 'extend' | 'suspend' | 'activate') => {
      setSelectedSubscription({ ...subscription, action });
      setShowPaymentModal(true);
    },
    []
  );

  const confirmAction = useCallback(async () => {
    if (!selectedSubscription || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé ou aucune action sélectionnée.');
      showToast('Action non valide', 'error');
      return;
    }

    try {
      if (selectedSubscription.action === 'extend') {
        const months = parseInt(monthsToExtend, 10);
        if (isNaN(months) || months < 1 || months > 12) {
          setError('Veuillez entrer un nombre de mois valide (1-12).');
          showToast('Nombre de mois invalide', 'error');
          return;
        }
        await dbService.agencySubscriptions.extend(selectedSubscription.agency_id ?? '', months);
        await logAudit('extend', 'agency_subscriptions', selectedSubscription.id, { next_payment_date: selectedSubscription.next_payment_date }, { months });
        showToast('Abonnement étendu avec succès ✅', 'success');
      } else if (selectedSubscription.action === 'suspend') {
        if (!suspensionReason) {
          setError('Veuillez fournir une raison pour la suspension.');
          showToast('Raison de suspension requise', 'error');
          return;
        }
        await dbService.agencySubscriptions.suspend(selectedSubscription.agency_id ?? '', suspensionReason);
        await logAudit('suspend', 'agency_subscriptions', selectedSubscription.id, { status: selectedSubscription.status }, { status: 'suspended', suspension_reason: suspensionReason });
        showToast('Abonnement suspendu avec succès ✅', 'success');
      } else if (selectedSubscription.action === 'activate') {
        await dbService.agencySubscriptions.activate(selectedSubscription.agency_id ?? '');
        await logAudit('activate', 'agency_subscriptions', selectedSubscription.id, { status: selectedSubscription.status }, { status: 'active' });
        showToast('Abonnement activé avec succès ✅', 'success');
      }

      await fetchSubscriptions();
      setShowPaymentModal(false);
      setSelectedSubscription(null);
      setMonthsToExtend('1');
      setSuspensionReason('');
      setError(null);
    } catch (err: any) {
      console.error(`Erreur lors de l’action ${selectedSubscription?.action}:`, err);
      const errorMessage = err.message || 'Erreur inconnue';
      setError(errorMessage);
      showToast(`Erreur: ${errorMessage}`, 'error');
    }
  }, [selectedSubscription, monthsToExtend, suspensionReason, fetchSubscriptions, admin, showToast, logAudit]);

  const totalMonthlyRevenue = subscriptions
    .filter((sub) => sub.status === 'active')
    .reduce((total, sub) => total + (sub.monthly_fee || 0), 0);

  const suspendedCount = subscriptions.filter((sub) => sub.status === 'suspended').length;

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Gestion des Abonnements</h2>
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchSubscriptions}>
            Réessayer
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gestion des Abonnements</h2>
        <div className="flex items-center space-x-3">
          <Badge variant="success" size="sm">
            {formatCurrency(totalMonthlyRevenue)} / mois
          </Badge>
          {suspendedCount > 0 && (
            <Badge variant="danger" size="sm">
              {suspendedCount} suspendu{suspendedCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

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
              {subscriptions.filter((s) => s.status === 'active').length}
            </div>
            <p className="text-sm text-gray-600">Abonnements actifs</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600 mb-2">{suspendedCount}</div>
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
      {subscriptions.length > 0 ? (
        <div className="space-y-4">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{agencyNames[subscription.agency_id ?? ''] || subscription.agency_id}</h3>
                    <p className="text-sm text-gray-500">
                      Plan {getPlanLabel(subscription.plan_type)} -{' '}
                      {formatCurrency(subscription.monthly_fee)}/mois
                    </p>
                  </div>
                  <Badge variant={getStatusColor(subscription.status)} size="sm">
                    {getStatusLabel(subscription.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Dernier paiement</p>
                    <p className="font-medium">
                      {subscription.last_payment_date
                        ? new Date(subscription.last_payment_date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Aucun'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Prochain paiement</p>
                    <p className="font-medium">
                      {subscription.next_payment_date
                        ? new Date(subscription.next_payment_date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Non défini'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Statut échéance</p>
                    <p className="font-medium text-blue-600">
                      {subscription.status === 'trial'
                        ? `${subscription.trial_days_remaining || 0} jours d'essai`
                        : getStatusLabel(subscription.status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total payé</p>
                    <p className="font-medium">
                      {formatCurrency(
                        (subscription.payment_history as { amount: number; date: string }[] | null)?.reduce(
                          (total, payment) => total + payment.amount,
                          0
                        ) || 0
                      )}
                    </p>
                  </div>
                </div>

                {/* Payment History Preview */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Historique récent</p>
                  <div className="flex space-x-2">
                    {(subscription.payment_history as { amount: number; date: string }[] | null)?.slice(0, 3)?.map((payment, index) => (
                      <div key={index} className="flex items-center space-x-1 text-xs">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>
                          {new Date(payment.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    )) || <span className="text-xs text-gray-500">Aucun paiement</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    {subscription.status === 'suspended' && (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span>Abonnement suspendu</span>
                      </div>
                    )}
                    {subscription.status === 'trial' && (
                      <div className="flex items-center text-yellow-600 text-sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Période d'essai</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePaymentAction(subscription, 'extend')}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Étendre
                    </Button>
                    {subscription.status === 'active' || subscription.status === 'trial' ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handlePaymentAction(subscription, 'suspend')}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspendre
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePaymentAction(subscription, 'activate')}
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

      {/* Payment Action Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedSubscription(null);
          setMonthsToExtend('1');
          setSuspensionReason('');
          setError(null);
        }}
        title={
          selectedSubscription?.action === 'extend'
            ? "Étendre l'abonnement"
            : selectedSubscription?.action === 'suspend'
            ? "Suspendre l'abonnement"
            : "Activer l'abonnement"
        }
        size="md"
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{agencyNames[selectedSubscription.agency_id ?? ''] || selectedSubscription.agency_id}</h4>
              <p className="text-sm text-gray-600">
                Plan {getPlanLabel(selectedSubscription.plan_type)} -{' '}
                {formatCurrency(selectedSubscription.monthly_fee)}/mois
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {selectedSubscription.action === 'extend' && (
              <div className="space-y-4">
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
                    L'abonnement sera étendu et le prochain paiement sera reporté.
                  </p>
                </div>
              </div>
            )}

            {selectedSubscription.action === 'suspend' && (
              <div className="space-y-4">
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
              </div>
            )}

            {selectedSubscription.action === 'activate' && (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    L'agence retrouvera l'accès complet à la plateforme.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedSubscription(null);
                  setMonthsToExtend('1');
                  setSuspensionReason('');
                  setError(null);
                }}
              >
                Annuler
              </Button>
              <Button
                variant={selectedSubscription.action === 'suspend' ? 'danger' : 'primary'}
                onClick={confirmAction}
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