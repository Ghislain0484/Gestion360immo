import React, { useState, useEffect } from 'react';
import { MessageSquare, ShieldCheck, Key, RefreshCw, Save, HelpCircle, Eye, Trash2, ArrowUpRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getFlutterwaveConfig } from '../../lib/flutterwave';

export const SmsSettings: React.FC = () => {
  const { user, agencyId, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingSender, setSavingSender] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  
  // Agency specific SMS state
  const [smsBalance, setSmsBalance] = useState(0);
  const [smsExpiryDate, setSmsExpiryDate] = useState<string | null>(null);
  const [senderName, setSenderName] = useState('G360Immo');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  useEffect(() => {
    loadSmsData();
  }, [agencyId]);

  const loadSmsData = async () => {
    if (!agencyId) return;
    setLoading(true);
    try {
      // 1. Fetch current agency SMS details
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('sms_balance, sms_expiry_date, sms_sender_name')
        .eq('id', agencyId)
        .single();

      if (agencyError) throw agencyError;

      if (agency) {
        setSmsBalance(agency.sms_balance || 0);
        setSmsExpiryDate(agency.sms_expiry_date || null);
        setSenderName(agency.sms_sender_name || 'G360Immo');
      }

      // 2. Fetch packages, purchase history, and sms logs in parallel
      const [packsRes, historyRes, logsRes] = await Promise.all([
        supabase.from('sms_packages').select('*').eq('active', true).order('price_xof', { ascending: true }),
        supabase.from('sms_purchase_history').select('*, sms_packages(name)').eq('agency_id', agencyId).order('created_at', { ascending: false }).limit(20),
        supabase.from('sms_logs').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false }).limit(20)
      ]);

      if (packsRes.data) setPackages(packsRes.data);
      if (historyRes.data) setPurchaseHistory(historyRes.data);
      if (logsRes.data) setSmsLogs(logsRes.data);

    } catch (err) {
      console.error("Erreur de chargement SMS:", err);
      toast.error("Impossible de charger les données SMS.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSenderName = async () => {
    if (!agencyId || !senderName.trim()) return;
    if (senderName.length > 11) {
      toast.error("Le nom d'expéditeur ne doit pas dépasser 11 caractères (norme GSM).");
      return;
    }
    // Only letters and numbers allowed
    if (!/^[a-zA-Z0-9]+$/.test(senderName.trim())) {
      toast.error("Le nom d'expéditeur ne doit contenir que des lettres et chiffres sans espaces.");
      return;
    }

    setSavingSender(true);
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ sms_sender_name: senderName.trim() })
        .eq('id', agencyId);

      if (error) throw error;
      toast.success("Nom d'expéditeur mis à jour avec succès !");
      await refreshAuth();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour.");
    } finally {
      setSavingSender(false);
    }
  };

  const triggerPurchaseVerification = async (response: any, pack: any) => {
    try {
      const verifyResponse = await fetch('/api/sms/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: response.transaction_id,
          tx_ref: response.tx_ref,
          agency_id: agencyId,
          package_id: pack.id,
          amount: pack.price_xof,
          email: user?.email
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok && verifyData.ok) {
        toast.success(verifyData.message || "Recharge SMS créditée avec succès !", { duration: 6000 });
        loadSmsData();
      } else {
        throw new Error(verifyData.error || "La validation du paiement a échoué.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur de validation. Veuillez contacter le support.");
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const handleBuyPackage = (pack: any) => {
    if (!user || !agencyId) return;

    setIsSubmittingPurchase(true);

    const config = getFlutterwaveConfig({
      amount: pack.price_xof,
      email: user.email || '',
      phone: (user as any).phone || '',
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      title: `GESTION360IMMO - ${pack.name}`,
      description: `Achat de ${pack.sms_count} SMS Professionnels`,
      tx_ref: `SMS-${pack.id.slice(0, 8)}-${Date.now()}`,
      payment_type: 'subscription',
      logo_url: 'https://jedknkbevxiyytsypjrv.supabase.co/storage/v1/object/public/platform/logo-main.png'
    });

    const fwConfig = {
      ...config,
      callback: (response: any) => {
        if (response.status === 'successful') {
          triggerPurchaseVerification(response, pack);
        } else {
          toast.error("Le paiement a été annulé ou a échoué.");
          setIsSubmittingPurchase(false);
        }
        if ((window as any).closePaymentModal) {
          (window as any).closePaymentModal();
        }
      },
      onClose: () => {
        setIsSubmittingPurchase(false);
      }
    };

    if ((window as any).FlutterwaveCheckout) {
      (window as any).FlutterwaveCheckout(fwConfig);
    } else {
      toast.error("Le module de paiement Flutterwave n'est pas encore chargé.");
      setIsSubmittingPurchase(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center">
        <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-gray-600 text-sm font-semibold">Chargement des données SMS Pro...</p>
      </Card>
    );
  }

  // Expiry check helper
  const today = new Date();
  const isExpired = smsExpiryDate ? new Date(smsExpiryDate) < today : true;

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Dynamic Expiration / Balance Alert Header */}
      {smsBalance > 0 && isExpired && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="font-semibold leading-normal">
            Vos crédits SMS ont expiré le {formatDate(smsExpiryDate)}. Achetez un forfait pour réactiver et fusionner vos SMS restants !
          </p>
        </div>
      )}

      {/* Grid of indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* SMS Balance Indicator */}
        <Card className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">SMS Restants</p>
              <h3 className="text-4xl font-black mt-1 leading-none tracking-tight">
                {smsBalance > 0 && !isExpired ? smsBalance : 0} <span className="text-lg font-medium">SMS</span>
              </h3>
            </div>
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-black uppercase tracking-wider">
              {isExpired ? 'Expiré' : 'Solde Actif'}
            </span>
            <p className="text-[10px] text-emerald-100/90 font-medium">
              Expire le : {formatDate(smsExpiryDate)}
            </p>
          </div>
        </Card>

        {/* Sender Name Configuration Card */}
        <Card className="p-6 bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Nom d'Expéditeur SMS (Sender ID)</p>
              <HelpCircle className="w-4 h-4 text-gray-400" title="Visible par les destinataires sur leur téléphone." />
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                maxLength={11}
                value={senderName}
                onChange={(e) => setSenderName(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="Ex: MonAgence"
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all uppercase"
              />
              <Button
                size="sm"
                onClick={handleSaveSenderName}
                isLoading={savingSender}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-[9px] text-gray-400 italic mt-3">
            Norme GSM : Max 11 caractères alphanumériques. Pas d'espaces ni d'accents.
          </p>
        </Card>

        {/* Info Rollover Card */}
        <Card className="p-6 bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Règle de Rollover Orange CI</span>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              Les SMS achetés ont une validité limitée. Si vous achetez une recharge avant la date d'expiration, <strong>tous vos SMS restants sont automatiquement reportés</strong> et prolongés selon la validité du nouveau forfait !
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-tight">
            <Clock className="w-3.5 h-3.5" />
            <span>Valable pour tous les packs</span>
          </div>
        </Card>

      </div>

      {/* Main Grid: Packages Shop & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Packages SMS Shop (monetized) */}
        <Card className="p-6 lg:col-span-5 border-slate-100 shadow-sm space-y-6">
          <div>
            <h4 className="font-black text-gray-900 text-base">La Boutique SMS Pro</h4>
            <p className="text-xs text-gray-500 mt-1">
              Rechargez instantanément le solde de votre agence par Mobile Money.
            </p>
          </div>

          <div className="space-y-3.5">
            {packages.map((pack) => (
              <div 
                key={pack.id}
                className="p-4 border-2 border-gray-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex justify-between items-center group"
              >
                <div>
                  <h5 className="font-black text-gray-900 text-sm leading-snug">{pack.name}</h5>
                  <p className="text-2xl font-black text-emerald-600 tracking-tight mt-1">
                    {pack.sms_count} <span className="text-xs font-semibold text-gray-500">SMS</span>
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                      Valable {pack.validity_days} jours
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded-md">
                      100 FCFA/SMS
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleBuyPackage(pack)}
                  isLoading={isSubmittingPurchase}
                  className="px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-black transition-all flex items-center gap-1.5 group-hover:scale-105"
                >
                  <span>{formatCurrency(pack.price_xof)}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Secure gateway seal */}
          <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-2xl p-4 flex gap-3 text-xs text-emerald-800 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">Paiement Mobile Money ultra-sécurisé</span>
              <p className="mt-0.5 text-emerald-800/80">
                Paiement instantané supportant <strong>Wave, Orange Money, MTN MoMo</strong> et Cartes Bancaires sécurisé par cryptage SSL.
              </p>
            </div>
          </div>
        </Card>

        {/* SMS logs & purchase history */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SMS Logs */}
          <Card className="overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h4 className="font-bold text-gray-900 text-sm">Journal des envois récents</h4>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Destinataire</th>
                    <th className="px-6 py-3 text-left">Message</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {smsLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-xs">
                        Aucun SMS envoyé pour le moment
                      </td>
                    </tr>
                  ) : (
                    smsLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-900 text-xs whitespace-nowrap">
                          {log.recipient}
                        </td>
                        <td className="px-6 py-3 text-gray-600 text-xs max-w-[200px] truncate" title={log.message}>
                          {log.message}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                            log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`} title={log.error_message || undefined}>
                            {log.status === 'sent' ? 'Délivré' : 'Échec'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Purchases History */}
          <Card className="overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h4 className="font-bold text-gray-900 text-sm">Historique des achats de recharges</h4>
            </div>
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Forfait</th>
                    <th className="px-6 py-3 text-center">SMS</th>
                    <th className="px-6 py-3 text-right">Prix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchaseHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-xs">
                        Aucune recharge achetée pour le moment
                      </td>
                    </tr>
                  ) : (
                    purchaseHistory.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-900 text-xs whitespace-nowrap">
                          {tx.sms_packages?.name || 'Recharge SMS'}
                        </td>
                        <td className="px-6 py-3 text-center text-xs font-bold text-emerald-600">
                          +{tx.sms_added} SMS
                        </td>
                        <td className="px-6 py-3 text-right font-black text-xs text-gray-900">
                          {formatCurrency(tx.amount_paid)}
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

export default SmsSettings;
