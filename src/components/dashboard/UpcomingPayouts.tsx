import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/config';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, Clock, ArrowRight, CheckCircle2, User } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { audioService } from '../../utils/audio';

interface PayoutAlert {
  owner_id: string;
  first_name: string;
  last_name: string;
  payment_mode: string;
  payout_preference_day: number;
  target_date: string;
  alert_level: 'urgent' | 'warning' | 'info';
  balance: number;
}

export const UpcomingPayouts: React.FC = () => {
  const { agencyId, user } = useAuth();
  const [payouts, setPayouts] = useState<PayoutAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, [agencyId]);

  const fetchPayouts = async () => {
    if (!agencyId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_upcoming_payouts', { p_agency_id: agencyId });
      if (error) throw error;
      setPayouts(data || []);
    } catch (err) {
      console.error('Error fetching payouts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async (payout: PayoutAlert) => {
    if (!agencyId || !user?.id) return;
    try {
      setPayingId(payout.owner_id);
      const { data, error } = await supabase.rpc('mark_owner_payout_paid', {
        p_agency_id: agencyId,
        p_owner_id: payout.owner_id,
        p_amount: payout.balance,
        p_payment_method: 'virement',
        p_user_id: user.id
      });
      
      if (error) throw error;
      
      toast.success(`Le reversement de ${formatCurrency(payout.balance)} a été enregistré dans la caisse.`);
      audioService.playCashOut();
      // Remove from list
      setPayouts(prev => prev.filter(p => p.owner_id !== payout.owner_id));
    } catch (err: any) {
      console.error('Error marking payout as paid:', err);
      toast.error('Erreur lors de l\'enregistrement du reversement.');
    } finally {
      setPayingId(null);
    }
  };

  const getAlertStyles = (level: string) => {
    switch (level) {
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const getPaymentModeLabel = (mode: string) => {
    switch (mode) {
      case 'virement_bancaire': return 'Virement';
      case 'retrait_physique': return 'Agence';
      case 'transfert_mobile': return 'Mobile Money';
      default: return 'Autre';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 rounded-xl w-full"></div>
          <div className="h-16 bg-gray-100 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  if (payouts.length === 0) {
    return null; // Don't show if there are no upcoming payouts
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
          Reversements Prévus
        </h3>
        <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
          {payouts.length} à traiter
        </span>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
        {payouts.map((payout) => (
          <div 
            key={payout.owner_id}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md ${getAlertStyles(payout.alert_level)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getAlertIcon(payout.alert_level)}
              </div>
              <div>
                <p className="font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 opacity-70" />
                  {payout.first_name} {payout.last_name}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm opacity-90">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Prévu le : <strong>{new Date(payout.target_date).toLocaleDateString('fr-FR')}</strong>
                  </span>
                  <span className="hidden sm:inline text-gray-400">•</span>
                  <span className="flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5" />
                    {getPaymentModeLabel(payout.payment_mode)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 ml-8 sm:ml-0">
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider opacity-70 font-semibold mb-0.5">À Reverser</p>
                <p className="font-black text-lg">{formatCurrency(payout.balance)}</p>
              </div>
              <button
                onClick={() => handleMarkAsPaid(payout)}
                disabled={payingId === payout.owner_id}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition-colors
                  ${payingId === payout.owner_id 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-white/80 hover:bg-white text-gray-800 shadow-sm border border-black/10'
                  }`}
              >
                {payingId === payout.owner_id ? (
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-gray-500 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Payer
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
