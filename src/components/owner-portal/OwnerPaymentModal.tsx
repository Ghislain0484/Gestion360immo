import React from 'react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ShieldCheck, Mail, Phone, User as UserIcon, Wrench } from 'lucide-react';
import { getFlutterwaveConfig } from '../../lib/flutterwave';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: {
    type: 'maintenance' | 'service_fee';
    amount: number;
    title: string;
    description: string;
    targetId?: string; // ticker_id or owner_id
    propertyId?: string;
  };
  onSuccess: () => void;
}

export const OwnerPaymentModal: React.FC<Props> = ({ isOpen, onClose, data, onSuccess }) => {
  const { owner } = useAuth();
  const [agencyLogo, setAgencyLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchAgencyLogo() {
      if (owner?.agency_id) {
        const { data: agencyData, error } = await supabase
          .from('agencies')
          .select('logo_url')
          .eq('id', owner.agency_id)
          .single();
        if (!error && agencyData) {
          setAgencyLogo(agencyData.logo_url);
        }
      }
    }
    if (isOpen) fetchAgencyLogo();
  }, [isOpen, owner?.agency_id]);

  if (!owner || !data) return null;

  const config = getFlutterwaveConfig({
    amount: data.amount,
    email: owner.email || '',
    phone: owner.phone || '',
    name: `${owner.first_name} ${owner.last_name}`,
    title: data.title,
    description: data.description,
    tx_ref: `${data.type === 'maintenance' ? 'MNT' : 'SRV'}-${data.targetId || owner.id}-${Date.now()}`,
    payment_type: data.type,
    logo_url: agencyLogo,
    metadata: {
      owner_id: owner.id,
      payment_context: data.type,
      target_id: data.targetId,
      property_id: data.propertyId
    }
  });

  const handleFlutterPayment = useFlutterwave(config);

  const startPayment = () => {
    handleFlutterPayment({
      callback: async (response) => {
        if (response.status === 'successful') {
          try {
            if (data.type === 'maintenance' && data.targetId) {
              const { error } = await supabase
                .from('tickets')
                .update({ status: 'resolved', updated_at: new Date().toISOString() })
                .eq('id', data.targetId);
              if (error) throw error;
              toast.success('Paiement réussi ! Travaux réglés.');
            } else if (data.type === 'service_fee') {
              // Mise à jour de l'abonnement propriétaire (30 jours supplémentaires)
              // On ajoute les 30 jours à la date actuelle ou à la date d'expiration existante (si future)
              const currentExpiry = owner.subscription_expires_at ? new Date(owner.subscription_expires_at) : new Date();
              const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
              
              const newExpiry = new Date(baseDate);
              newExpiry.setDate(newExpiry.getDate() + 30);
              
              const { error } = await supabase
                .from('owners')
                .update({ 
                  subscription_status: 'active',
                  subscription_expires_at: newExpiry.toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', owner.id);
              if (error) throw error;
              toast.success('Abonnement activé ! Merci pour votre confiance.');
            }

            onSuccess();
            onClose();
          } catch (err) {
            console.error('Erreur post-paiement:', err);
            toast.error('Paiement reçu mais erreur lors de la mise à jour système.');
          }
        } else {
          toast.error('Le paiement n\'a pas pu être complété.');
        }
        closePaymentModal();
      },
      onClose: () => {},
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={data.type === 'service_fee' ? 'Activation Services Premium' : 'Règlement de facture travaux'}>
      <div className="space-y-6 text-slate-900">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 ${data.type === 'service_fee' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'} rounded-xl flex items-center justify-center`}>
                {data.type === 'service_fee' ? <ShieldCheck className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.type === 'service_fee' ? 'Abonnement Portail' : 'Intervention'}</p>
                <p className="font-bold text-slate-900">{data.title}</p>
            </div>
          </div>
          <div className="flex justify-between items-center py-4 border-t border-slate-200">
            <span className="text-slate-500 font-medium">Montant à régler</span>
            <span className="text-2xl font-black text-emerald-600">{formatCurrency(data.amount)}</span>
          </div>
        </div>

        <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Vos informations de contact</h4>
            <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{owner.first_name} {owner.last_name}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl relative">
                    <Phone className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{owner.phone || 'Aucun numéro enregistré'}</span>
                    {!owner.phone && (
                        <span className="absolute right-3 text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded-full font-bold">Requis pour Mobile Money</span>
                    )}
                </div>
            </div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl flex items-start gap-3 border border-emerald-100">
          <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
          <p className="text-sm text-emerald-800 leading-relaxed">
            Paiement sécurisé via Flutterwave. Règlement par <strong>Mobile Money</strong> ou <strong>Carte Bancaire</strong>.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-12 font-bold transition-all hover:bg-slate-100">
            Plus tard
          </Button>
          <Button 
            onClick={startPayment} 
            className="flex-1 bg-emerald-600 text-white rounded-xl h-12 font-bold shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
            disabled={!owner.phone && data.amount > 0}
          >
            Régler {formatCurrency(data.amount)}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
