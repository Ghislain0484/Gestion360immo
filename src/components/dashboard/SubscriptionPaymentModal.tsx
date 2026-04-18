import React from 'react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ShieldCheck, Mail, Phone, User as UserIcon } from 'lucide-react';
import { getFlutterwaveConfig } from '../../lib/flutterwave';
import { AgencySubscription } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { agencySubscriptionsService } from '../../lib/db/agencySubscriptionsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subscription: AgencySubscription;
  onSuccess: () => void;
}

export const SubscriptionPaymentModal: React.FC<Props> = ({ isOpen, onClose, subscription, onSuccess }) => {
  const { user } = useAuth();

  if (!user) return null;

  const config = getFlutterwaveConfig({
    amount: subscription.monthly_fee,
    email: user.email,
    phone: user.phone || '',
    name: `${user.first_name} ${user.last_name}`,
    title: `Abonnement Gestion360 - ${subscription.plan_type.toUpperCase()}`,
    description: `Paiement mensuel pour l'agence ${user.agencies?.find((a: any) => a.agency_id === user.agency_id)?.name || ''}`,
    tx_ref: `SUB-${subscription.id}-${Date.now()}`,
    payment_type: 'subscription',
    logo_url: user.agencies?.find((a: any) => a.agency_id === user.agency_id)?.logo_url,
    metadata: {
      agency_id: user.agency_id,
      subscription_id: subscription.id
    }
  });

  const handleFlutterPayment = useFlutterwave(config);

  const startPayment = () => {
    handleFlutterPayment({
      callback: async (response) => {
        console.log('Flutterwave Response:', response);
        if (response.status === 'successful') {
          try {
            // Dans un vrai scénario, on devrait vérifier la transaction côté serveur via webhook
            // Ici on met à jour directement pour la démo/V1
            await agencySubscriptionsService.extend(subscription.agency_id!, 1);
            toast.success('Paiement réussi ! Votre abonnement a été prolongé.');
            onSuccess();
          } catch (err) {
            console.error('Erreur mise à jour abonnement:', err);
            toast.error('Paiement reçu mais erreur lors de la mise à jour de l\'abonnement. Veuillez contacter le support.');
          }
        } else {
            toast.error('Le paiement n\'a pas pu être complété.');
        }
        closePaymentModal();
      },
      onClose: () => {
        console.log('Payment modal closed');
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
      <div className="space-y-6">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 font-medium">Forfait actuel</span>
            <span className="font-bold text-slate-900 uppercase">{subscription.plan_type}</span>
          </div>
          <div className="flex justify-between items-center py-4 border-t border-slate-200">
            <span className="text-slate-500 font-medium">Montant à régler</span>
            <span className="text-2xl font-black text-primary-600">{formatCurrency(subscription.monthly_fee)}</span>
          </div>
          <div className="flex justify-between items-center py-4 border-t border-slate-200">
            <span className="text-slate-500 font-medium">Validité</span>
            <span className="font-medium text-slate-700">+1 Mois après paiement</span>
          </div>
        </div>

        <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Vos informations de contact</h4>
            <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{user.first_name} {user.last_name}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl relative">
                    <Phone className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{user.phone || 'Aucun numéro enregistré'}</span>
                    {!user.phone && (
                        <span className="absolute right-3 text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded-full font-bold">Requis pour Mobile Money</span>
                    )}
                </div>
            </div>
        </div>

        <div className="p-4 bg-primary-50 rounded-xl flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary-600 mt-0.5" />
          <p className="text-sm text-primary-800 leading-relaxed">
            Paiement sécurisé via Flutterwave. Vous pouvez payer par <strong>Carte bancaire (Visa/Mastercard)</strong>, 
            <strong>Mobile Money (Orange, MTN, Moov, Wave)</strong> ou par <strong>Virement bancaire</strong>.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-12 font-bold">
            Annuler
          </Button>
          <Button 
            onClick={startPayment} 
            className="flex-1 btn-premium h-12 shadow-lg shadow-primary-500/25"
            disabled={!user.phone && subscription.monthly_fee > 0}
          >
            Payer {formatCurrency(subscription.monthly_fee)}
          </Button>
        </div>

        {!user.phone && (
            <p className="text-[11px] text-center text-red-500 font-medium mt-2">
                Note : Veuillez ajouter votre numéro de téléphone dans votre profil pour utiliser le Mobile Money.
            </p>
        )}
      </div>
    </Modal>
  );
};
