import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/config';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SubscriptionPaymentModal } from './SubscriptionPaymentModal';
import { AgencySubscription } from '../../types/db';

export const AgencySubscriptionStatus: React.FC = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<AgencySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user?.agency_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agency_subscriptions')
        .select('*')
        .eq('agency_id', user.agency_id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.agency_id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  if (loading || !user?.agency_id || !subscription) return null;

  const isTrial = subscription.status === 'trial';
  const isSuspended = subscription.status === 'suspended' || subscription.status === 'cancelled';
  const nextPaymentDate = new Date(subscription.next_payment_date);
  const today = new Date();
  const diffDays = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const needsPayment = diffDays <= 7 || isSuspended;

  return (
    <Card className="overflow-hidden border-none bg-white shadow-premium dark:bg-slate-900/90 dark:ring-1 dark:ring-slate-800">
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-xl p-3 ${
                isTrial
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
              }`}
            >
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Abonnement {subscription.plan_type.toUpperCase()}
                </h3>
                <Badge variant={isTrial ? 'secondary' : subscription.status === 'active' ? 'success' : 'warning'}>
                  {isTrial ? "Periode d'essai" : subscription.status === 'active' ? 'Actif' : 'Suspendu'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isTrial
                  ? `Votre essai gratuit se termine dans ${diffDays} jours (${nextPaymentDate.toLocaleDateString('fr-FR')})`
                  : `Prochaine echeance : ${nextPaymentDate.toLocaleDateString('fr-FR')}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="mr-4 text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Montant mensuel
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  minimumFractionDigits: 0,
                }).format(subscription.monthly_fee)}
              </p>
            </div>
            <Button
              onClick={() => setShowPaymentModal(true)}
              className={
                needsPayment
                  ? 'btn-premium border-none'
                  : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
              }
            >
              {needsPayment ? 'Payer maintenant' : "Gerer l'abonnement"}
            </Button>
          </div>
        </div>

        {needsPayment && !isSuspended && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>
              Votre abonnement arrive a echeance bientot. Payez maintenant pour eviter toute interruption de service.
            </p>
          </div>
        )}

        {isSuspended && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>
              <strong>Abonnement suspendu.</strong> Veuillez regulariser votre situation pour reactiver l'acces complet a la plateforme.
            </p>
          </div>
        )}
      </div>

      <SubscriptionPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        subscription={subscription}
        onSuccess={() => {
          fetchSubscription();
          setShowPaymentModal(false);
        }}
      />
    </Card>
  );
};
