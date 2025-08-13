import React, { useState } from 'react';
import { DollarSign, Calendar, AlertTriangle, CheckCircle, CreditCard, Ban } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { dbService } from '../../lib/supabase';
import { useEffect } from 'react';

export const SubscriptionManagement: React.FC = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const subscriptionsData = await dbService.getAllSubscriptions();
        setSubscriptions(subscriptionsData);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const plans = [
    {
      id: 'basic',
      name: 'Basique',
      price: 25000,
      features: ['Jusqu\'à 50 propriétés', 'Support email', 'Rapports basiques']
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 50000,
      features: ['Propriétés illimitées', 'Support prioritaire', 'Rapports avancés', 'Collaboration inter-agences']
    },
    {
      id: 'enterprise',
      name: 'Entreprise',
      price: 100000,
      features: ['Tout Premium +', 'API personnalisée', 'Support dédié', 'Formation sur site']
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'overdue': return 'danger';
      case 'trial': return 'warning';
      case 'suspended': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'overdue': return 'En retard';
      case 'trial': return 'Essai';
      case 'suspended': return 'Suspendu';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePaymentAction = async (subscription: any, action: 'extend' | 'suspend' | 'activate') => {
    setSelectedSubscription({ ...subscription, action });
    setShowPaymentModal(true);
  };

  const totalMonthlyRevenue = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((total, sub) => total + (sub.monthly_fee || 0), 0);

  const overdueCount = subscriptions.filter(sub => sub.status === 'overdue').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
          {overdueCount > 0 && (
            <Badge variant="danger" size="sm">
              {overdueCount} en retard
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
              {subscriptions.filter(s => s.status === 'active').length}
            </div>
            <p className="text-sm text-gray-600">Abonnements actifs</p>
          </div>
        </Card>
        
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600 mb-2">
              {overdueCount}
            </div>
            <p className="text-sm text-gray-600">Paiements en retard</p>
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
                  <h3 className="font-semibold text-gray-900">{subscription.agency_name}</h3>
                  <p className="text-sm text-gray-500">
                    Plan {subscription.plan_type?.charAt(0).toUpperCase() + subscription.plan_type?.slice(1)} - 
                    {formatCurrency(subscription.monthly_fee || 0)}/mois
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
                      ? new Date(subscription.last_payment_date).toLocaleDateString('fr-FR')
                      : 'Aucun'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Prochain paiement</p>
                  <p className="font-medium">
                    {subscription.next_payment_date 
                      ? new Date(subscription.next_payment_date).toLocaleDateString('fr-FR')
                      : 'Non défini'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut échéance</p>
                  <p className="font-medium text-blue-600">
                    {subscription.status === 'trial' 
                      ? `${subscription.trial_days_remaining || 0} jours d'essai`
                      : subscription.status
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total payé</p>
                  <p className="font-medium">{formatCurrency(subscription.total_paid || 0)}</p>
                </div>
              </div>

              {/* Payment History Preview */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Historique récent</p>
                <div className="flex space-x-2">
                  {(subscription.payment_history || []).slice(0, 3).map((payment: any, index: number) => (
                    <div key={index} className="flex items-center space-x-1 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{new Date(payment.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))}
                  {(!subscription.payment_history || subscription.payment_history.length === 0) && (
                    <span className="text-xs text-gray-500">Aucun paiement</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  {subscription.status === 'overdue' && (
                    <div className="flex items-center text-red-600 text-sm">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      <span>Paiement en retard</span>
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
                  {subscription.status === 'active' ? (
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun abonnement
          </h3>
          <p className="text-gray-600">
            Les abonnements des agences apparaîtront ici.
          </p>
        </Card>
      )}

      {/* Payment Action Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedSubscription(null);
        }}
        title={`${selectedSubscription?.action === 'extend' ? 'Étendre l\'abonnement' : 
                selectedSubscription?.action === 'suspend' ? 'Suspendre l\'abonnement' : 
                'Activer l\'abonnement'}`}
        size="md"
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{selectedSubscription.agency_name}</h4>
              <p className="text-sm text-gray-600">
                Plan {selectedSubscription.plan_type} - {formatCurrency(selectedSubscription.monthly_fee || 0)}/mois
              </p>
            </div>

            {selectedSubscription.action === 'extend' && (
              <div className="space-y-4">
                <Input
                  label="Nombre de mois à ajouter"
                  type="number"
                  min="1"
                  max="12"
                  defaultValue="1"
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
                    L'agence perdra l'accès à la plateforme jusqu'au règlement des impayés.
                  </p>
                </div>
                <Input
                  label="Raison de la suspension"
                  placeholder="Ex: Impayé depuis 15 jours"
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
              <Button variant="ghost" onClick={() => setShowPaymentModal(false)}>
                Annuler
              </Button>
              <Button 
                variant={selectedSubscription.action === 'suspend' ? 'danger' : 'primary'}
                onClick={() => {
                  console.log(`${selectedSubscription.action} subscription:`, selectedSubscription.id);
                  setShowPaymentModal(false);
                }}
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