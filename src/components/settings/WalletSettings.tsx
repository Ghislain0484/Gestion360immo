import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, TrendingUp, Info, Zap } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { FintechService } from '../../lib/db/fintechService';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatAmount } from '../../utils/format';
import { toast } from 'react-hot-toast';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { getFlutterwaveConfig } from '../../lib/flutterwave';
import { supabase } from '../../lib/supabase';

export const WalletSettings: React.FC = () => {
  const { user, agencyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [potential, setPotential] = useState(0);
  const [selectedPack, setSelectedPack] = useState<any>(null);

  useEffect(() => {
    loadFintechData();
  }, [agencyId, user?.id]);

  const loadFintechData = async () => {
    const targetAgencyId = agencyId || user?.agency_id;
    if (!targetAgencyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [walletData, txs, pot] = await Promise.all([
        FintechService.getWallet(targetAgencyId),
        FintechService.getTransactions(targetAgencyId),
        FintechService.getMonthlyPotential(targetAgencyId)
      ]);
      setWallet(walletData);
      setTransactions(txs);
      setPotential(pot);
    } catch (err) {
      console.error('Error loading fintech data:', err);
      // toast.error('Erreur lors du chargement des données financières');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = (pack: { qty: number; price: number; bonus: number }) => {
    if (!user) return;
    
    const config = getFlutterwaveConfig({
      amount: pack.price,
      email: user.email || '',
      phone: (user as any).phone || '',
      name: `${user.first_name || ''} ${user.last_name || ''}`,
      title: `Recharge ${pack.qty + pack.bonus} Crédits`,
      description: `Achat de crédits pour la plateforme GESTION360IMMO`,
      tx_ref: `WAL-${Date.now()}-${user.id.slice(0, 8)}`,
      payment_type: 'subscription',
    });

    // Flutterwave script global logic
    const fwConfig = {
      ...config,
      callback: async (response: any) => {
        if (response.status === 'successful') {
          try {
            const targetAgencyId = agencyId || user?.agency_id;
            if (!targetAgencyId) throw new Error('No agency ID');

            const creditsToAdd = pack.qty + pack.bonus;
            const { data: currentWallet } = await supabase.from('agency_wallets').select('balance').eq('agency_id', targetAgencyId).single();
            const newBalance = (currentWallet?.balance || 0) + pack.price;

            await supabase.from('agency_wallets').update({ balance: newBalance }).eq('agency_id', targetAgencyId);
            await supabase.from('wallet_transactions').insert({
              agency_id: targetAgencyId,
              amount: pack.price,
              type: 'deposit',
              description: `Recharge de ${creditsToAdd} crédits`,
              reference: response.transaction_id.toString(),
              metadata: { response }
            });

            toast.success(`Félicitations ! ${creditsToAdd} crédits ont été ajoutés.`);
            loadFintechData();
          } catch (err) {
            toast.error('Paiement réussi mais erreur de mise à jour.');
          }
        }
        closePaymentModal();
      },
      onClose: () => {},
    };

    // Use window.FlutterwaveCheckout if hook is tricky with dynamic amounts
    if ((window as any).FlutterwaveCheckout) {
      (window as any).FlutterwaveCheckout(fwConfig);
    } else {
      toast.error("Le module de paiement n'est pas encore chargé.");
    }
  };

  const platformFee = FintechService.calculatePlatformFee(potential);

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner size="lg" color="indigo" /></div>;

  return (
    <div className="space-y-6">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Solde Portefeuille</p>
              <h3 className="text-3xl font-black mt-1">{formatAmount(wallet?.balance || 0)} <span className="text-lg">FCFA</span></h3>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <span className="px-2 py-1 bg-white/20 rounded-lg text-xs font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
              {wallet?.bonus_credits || 0} crédits offerts
            </span>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Potentiel Mensuel</p>
              <h3 className="text-3xl font-black mt-1 text-gray-900">{formatAmount(potential)} <span className="text-lg">FCFA</span></h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1 italic">
            <Info className="w-3 h-3" />
            Basé sur {wallet?.bonus_credits > 0 ? 'vos baux actifs' : 'vos baux occupés'}
          </p>
        </Card>

        <Card className="p-6 bg-white border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-rose-500 text-sm font-black uppercase tracking-wider">Commission GESTION360IMMO (1%)</p>
              <h3 className="text-3xl font-black mt-1 text-gray-900">{formatAmount(platformFee)} <span className="text-lg">FCFA</span></h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-2xl">
              <CreditCard className="w-6 h-6 text-rose-600" />
            </div>
          </div>
          <button className="mt-4 w-full py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">
            Régler la commission
          </button>
        </Card>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recharge & Actions */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6">
            <h4 className="font-bold text-gray-900 mb-4">Recharger des crédits</h4>
            <div className="space-y-3">
              {[
                { qty: 5, price: 5000, bonus: 0 },
                { qty: 12, price: 10000, bonus: 2 },
                { qty: 30, price: 25000, bonus: 5 },
              ].map((pack, i) => (
                <button 
                  key={i}
                  onClick={() => handleRecharge(pack)}
                  className="w-full p-4 border-2 border-gray-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex justify-between items-center group text-left"
                >
                  <div>
                    <p className="font-black text-gray-900">{pack.qty + pack.bonus} Crédits</p>
                    <p className="text-xs text-gray-500">{formatAmount(pack.price)} FCFA</p>
                  </div>
                  <div className="bg-gray-100 group-hover:bg-indigo-600 group-hover:text-white p-2 rounded-full transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 leading-relaxed">
              <strong>Note :</strong> Les crédits permettent de solliciter des informations auprès d'autres agences. 
              50% du crédit va à l'agence source et 50% à la plateforme.
            </div>
          </Card>
        </div>

        {/* Transactions History */}
        <div className="lg:col-span-8">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Historique des transactions</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Description</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                        Aucune transaction pour le moment
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 font-medium">
                          {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {tx.description}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                            tx.type === 'deposit' ? 'bg-emerald-100 text-emerald-700' :
                            tx.type === 'usage' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-black ${
                          tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
