import React from 'react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { ShieldCheck, Mail, Phone, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { getFlutterwaveConfig } from '../../lib/flutterwave';
import { AgencySubscription } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subscription: AgencySubscription;
  onSuccess: () => void;
}

interface VerifySubscriptionPaymentResponse {
  ok: boolean;
  error?: string;
  alreadyProcessed?: boolean;
  message?: string;
  status?: string;
  next_payment_date?: string;
}

export const SubscriptionPaymentModal: React.FC<Props> = ({ isOpen, onClose, subscription, onSuccess }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const currentAgency = user?.agencies?.find((agency) => agency.agency_id === user?.agency_id);

  const config = getFlutterwaveConfig({
    amount: subscription.monthly_fee,
    email: user?.email || '',
    phone: user?.phone || '',
    name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    title: `Abonnement Gestion360 - ${subscription.plan_type.toUpperCase()}`,
    description: `Paiement mensuel pour l'agence ${currentAgency?.name || ''}`,
    tx_ref: `SUB-${subscription.id}-${Date.now()}`,
    payment_type: 'subscription',
    logo_url: currentAgency?.logo_url,
    metadata: {
      agency_id: user?.agency_id,
      subscription_id: subscription.id,
      payment_type: 'subscription',
    }
  });

  const handleFlutterPayment = useFlutterwave(config);

  if (!user) return null;

  const verifySubscriptionPayment = async (response: {
    transaction_id: number;
    tx_ref: string;
    status: string;
    amount: number;
    currency: string;
  }) => {
    const apiResponse = await fetch('/api/payments/verify-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: response.transaction_id,
        tx_ref: response.tx_ref,
        agency_id: subscription.agency_id,
        subscription_id: subscription.id,
        expected_amount: subscription.monthly_fee,
        currency: response.currency || 'XOF',
        email: user.email,
      }),
    });

    const payload = await apiResponse.json().catch(() => null) as VerifySubscriptionPaymentResponse | null;

    if (!apiResponse.ok || !payload?.ok) {
      throw new Error(payload?.error || 'Le serveur n a pas pu verifier le paiement.');
    }

    return payload;
  };

  const startPayment = () => {
    setIsSubmitting(true);

    handleFlutterPayment({
      callback: async (response) => {
        try {
          if (response.status !== 'successful') {
            toast.error("Le paiement n'a pas pu etre complete.");
            return;
          }

          const verification = await verifySubscriptionPayment(response);
          toast.success(
            verification.message || (
              verification.alreadyProcessed
                ? 'Paiement deja confirme.'
                : 'Paiement verifie et abonnement mis a jour.'
            ),
            { duration: 6000 }
          );
          onSuccess();
          onClose();
        } catch (error) {
          console.error('Erreur verification abonnement:', error);
          toast.error(
            error instanceof Error
              ? error.message
              : "Paiement recu mais verification impossible. Veuillez contacter le support."
          );
        } finally {
          setIsSubmitting(false);
          closePaymentModal();
        }
      },
      onClose: () => {
        setIsSubmitting(false);
      },
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Paiement de l'abonnement">
      <div className="space-y-6 text-slate-900 dark:text-slate-100">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/70">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-medium text-slate-500 dark:text-slate-400">Forfait actuel</span>
            <span className="font-bold uppercase text-slate-900 dark:text-slate-100">{subscription.plan_type}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 py-4 dark:border-slate-700">
            <span className="font-medium text-slate-500 dark:text-slate-400">Montant a regler</span>
            <span className="text-2xl font-black text-primary-600 dark:text-primary-400">{formatCurrency(subscription.monthly_fee)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 py-4 dark:border-slate-700">
            <span className="font-medium text-slate-500 dark:text-slate-400">Validite</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">+1 mois apres paiement</span>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Vos informations de contact
          </h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <UserIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <span className="text-sm text-slate-700 dark:text-slate-200">{user.first_name} {user.last_name}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
              <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              <span className="text-sm text-slate-700 dark:text-slate-200">{user.email}</span>
            </div>
            <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
              <Phone className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              <span className="text-sm text-slate-700 dark:text-slate-200">{user.phone || 'Aucun numero enregistre'}</span>
              {!user.phone && (
                <span className="absolute right-3 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                  Mobile Money requis
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-primary-50 p-4 dark:bg-primary-500/10">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary-600 dark:text-primary-400" />
          <p className="text-sm leading-relaxed text-primary-800 dark:text-primary-200">
            Paiement securise via Flutterwave. Vous pouvez payer par <strong>Carte bancaire (Visa/Mastercard)</strong>,
            <strong> Mobile Money (Orange, MTN, Moov, Wave)</strong> ou par <strong>Virement bancaire</strong>.
            {!user.phone && (
              <span className="mt-2 block text-xs font-medium text-amber-700 dark:text-amber-300">
                Vous pouvez continuer sans numero de telephone pour les paiements non Mobile Money.
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="h-12 flex-1 rounded-xl font-bold" disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            onClick={startPayment}
            className="h-12 flex-1 btn-premium shadow-lg shadow-primary-500/25"
            isLoading={isSubmitting}
          >
            Payer {formatCurrency(subscription.monthly_fee)}
          </Button>
        </div>

        {!user.phone && (
          <p className="mt-2 text-center text-[11px] font-medium text-amber-600 dark:text-amber-300">
            Note : ajoutez votre numero de telephone dans votre profil si vous voulez utiliser le Mobile Money.
          </p>
        )}
      </div>
    </Modal>
  );
};
