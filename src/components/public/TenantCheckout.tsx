import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { supabase } from '../../lib/config';
import { getFlutterwaveConfig } from '../../lib/flutterwave';
import { downloadReceiptPDF } from '../../utils/receiptActions';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  ShieldCheck, 
  CreditCard, 
  User, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Building,
  TrendingUp,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS_FR = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const TenantCheckout: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [agency, setAgency] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    async function loadCheckoutData() {
      if (!receiptId) return;
      try {
        setIsLoading(true);
        // 1. Fetch Rent Receipt
        const { data: rc, error: rcErr } = await supabase
          .from('rent_receipts')
          .select('*')
          .eq('id', receiptId)
          .single();

        if (rcErr || !rc) throw new Error("Facture introuvable.");

        setReceipt(rc);
        if (rc.payment_status === 'paid') {
          setPaymentSuccess(true);
        }

        // 2. Fetch Contract
        const { data: ctr } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', rc.contract_id)
          .maybeSingle();
        setContract(ctr);

        // 3. Fetch Tenant
        const { data: tn } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', rc.tenant_id)
          .single();
        setTenant(tn);

        // 4. Fetch Property
        const { data: pr } = await supabase
          .from('properties')
          .select('*')
          .eq('id', rc.property_id)
          .single();
        setProperty(pr);

        // 5. Fetch Agency
        const { data: ag } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', rc.owner_id ? pr.agency_id : rc.issued_by) // Fallback check for agency relation
          .maybeSingle();
        
        // If still null, fetch agency from tenants relation
        if (!ag && tn?.agency_id) {
          const { data: agAlt } = await supabase
            .from('agencies')
            .select('*')
            .eq('id', tn.agency_id)
            .single();
          setAgency(agAlt);
        } else {
          setAgency(ag);
        }

        // 6. Fetch Owner
        if (rc.owner_id) {
          const { data: ow } = await supabase
            .from('owners')
            .select('*')
            .eq('id', rc.owner_id)
            .single();
          setOwner(ow);
        }
      } catch (err: any) {
        console.error("Error loading checkout details:", err);
        toast.error(err.message || "Erreur de chargement des informations.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCheckoutData();
  }, [receiptId]);

  // Configure Flutterwave
  const amountToPay = receipt ? (receipt.balance_due ?? receipt.total_amount) : 0;
  const config = getFlutterwaveConfig({
    amount: amountToPay,
    email: tenant?.email || 'locataire@gestion360immo.com',
    phone: tenant?.phone || '',
    name: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Locataire',
    title: agency ? `Règlement Loyer - ${agency.name}` : 'Règlement de votre loyer',
    description: receipt ? `Loyer ${MONTHS_FR[receipt.period_month] || receipt.period_month} ${receipt.period_year} - ${property?.title || 'Bien'}` : 'Paiement Loyer',
    tx_ref: `LOY-${receiptId}-${Date.now()}`,
    payment_type: 'service_fee', // Map context
    logo_url: agency?.logo_url,
    public_key: agency?.settings?.payment_gateways?.flutterwave?.public_key,
    metadata: {
      receipt_id: receiptId,
      tenant_id: receipt?.tenant_id,
      property_id: receipt?.property_id,
      agency_id: tenant?.agency_id
    }
  });

  const handleFlutterPayment = useFlutterwave(config);

  const startCheckout = () => {
    if (!tenant?.phone) {
      toast.error("Un numéro de téléphone de contact est requis pour procéder au paiement.");
      return;
    }

    setIsProcessing(true);
    handleFlutterPayment({
      callback: async (response) => {
        if (response.status === 'successful') {
          try {
            // 1. Update Rent Receipt status in DB
            const { error: updateErr } = await supabase
              .from('rent_receipts')
              .update({
                payment_status: 'paid',
                amount_paid: receipt.total_amount,
                balance_due: 0,
                payment_date: new Date().toISOString(),
                payment_method: 'mobile_money',
                notes: `Réglement en ligne sécurisé via Flutterwave. Réf: ${response.transaction_id}`
              })
              .eq('id', receiptId);

            if (updateErr) throw updateErr;

            // 2. Synchronize payment in Ledger (modular_transactions)
            const { error: ledgerErr } = await supabase
              .from('modular_transactions')
              .insert({
                agency_id: tenant.agency_id,
                created_by: receipt.issued_by || null,
                type: 'income',
                amount: receipt.total_amount,
                category: 'rent_receipt',
                description: `Paiement Loyer en ligne - ${tenant.first_name} ${tenant.last_name} (${MONTHS_FR[receipt.period_month]} ${receipt.period_year})`,
                transaction_date: new Date().toISOString().split('T')[0],
                payment_method: 'mobile_money',
                related_tenant_id: receipt.tenant_id,
                related_owner_id: receipt.owner_id,
                related_property_id: receipt.property_id,
                module_type: 'caisse'
              });

            if (ledgerErr) {
              console.error("Ledger synchronization error:", ledgerErr);
            }

            setPaymentSuccess(true);
            setReceipt(prev => ({
              ...prev,
              payment_status: 'paid',
              amount_paid: receipt.total_amount,
              balance_due: 0
            }));
            
            // Envoi automatique du SMS de confirmation (non-bloquant)
            if (tenant?.phone && tenant?.agency_id) {
              const smsMessage = `Cher(e) ${tenant.first_name} ${tenant.last_name}, votre paiement en ligne de ${receipt.total_amount.toLocaleString('fr-FR')} FCFA pour le mois de ${MONTHS_FR[receipt.period_month]} ${receipt.period_year} a ete valide avec succes ! Ref: ${receipt.receipt_number}. - ${agency?.name || 'G360Immo'}`;
              
              fetch('/api/sms/send-sms', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  recipient: tenant.phone,
                  message: smsMessage,
                  agency_id: tenant.agency_id
                })
              }).catch(err => console.error("Erreur envoi SMS:", err));
            }

            toast.success("Votre paiement a été traité et enregistré avec succès !");
          } catch (err: any) {
            console.error("Post-checkout DB updates failed:", err);
            toast.error("Paiement validé mais erreur d'enregistrement. Veuillez contacter l'agence.");
          }
        } else {
          toast.error("Le règlement n'a pas pu être complété.");
        }
        setIsProcessing(false);
        closePaymentModal();
      },
      onClose: () => {
        setIsProcessing(false);
      }
    });
  };

  const handleDownloadReceipt = async () => {
    if (!receipt || !tenant) return;
    await downloadReceiptPDF(receipt, tenant.agency_id, {
      tenantName: `${tenant.first_name} ${tenant.last_name}`,
      ownerName: owner ? `${owner.first_name} ${owner.last_name}` : "N/A",
      propertyTitle: property?.title || "Bien Immobilier"
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" color="green" />
          <p className="text-sm font-semibold text-slate-400">Chargement de votre facture sécurisée...</p>
        </div>
      </div>
    );
  }

  if (!receipt || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl border border-slate-700 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-950/50 border border-red-800 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Facture introuvable</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Le lien de paiement que vous avez suivi est invalide ou expiré. Veuillez vous rapprocher de votre agence de gestion immobilière.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Main Card */}
        <Card className="bg-slate-800/90 backdrop-blur-md border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl relative">
          
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />

          {/* Agency Branding Block */}
          <div className="p-8 pb-4 border-b border-slate-700/50 flex flex-col items-center text-center space-y-4">
            {agency?.logo_url ? (
              <img src={agency.logo_url} alt="Logo Agence" className="h-16 w-auto object-contain max-w-[180px]" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xl flex items-center justify-center">
                {agency?.name ? agency.name.substring(0, 2).toUpperCase() : 'G3'}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">{agency?.name || 'GESTION 360 IMMO'}</h2>
              <p className="text-xs text-slate-400 font-medium">Service de règlement de loyers en ligne</p>
            </div>
          </div>

          {/* Payment Status or Main Checkout Body */}
          {paymentSuccess ? (
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/20 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-white">Règlement Réussi !</h1>
                <p className="text-slate-300 text-sm leading-relaxed max-w-sm mx-auto">
                  Votre loyer pour <strong>{MONTHS_FR[receipt.period_month]} {receipt.period_year}</strong> a été réglé avec succès. L'agence gestionnaire a été notifiée de la transaction.
                </p>
              </div>

              {/* Receipt Summary details */}
              <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/35 text-left text-xs space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">N° Quittance :</span>
                  <span className="text-slate-200 font-mono font-bold">{receipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Locataire :</span>
                  <span className="text-slate-200 font-bold">{tenant.first_name} {tenant.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Montant réglé :</span>
                  <span className="text-emerald-400 font-black">{formatCurrency(receipt.total_amount)}</span>
                </div>
              </div>

              <div className="pt-4 max-w-xs mx-auto">
                <button
                  onClick={handleDownloadReceipt}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger ma quittance PDF</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-6">
              {/* Due Invoice details card */}
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Facture Loyer en cours</p>
                    <h3 className="text-lg font-bold text-white">Loyer de {MONTHS_FR[receipt.period_month]} {receipt.period_year}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Montant dû</p>
                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(amountToPay)}</p>
                  </div>
                </div>

                <div className="border-t border-slate-700/50 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-slate-500">Locataire</p>
                      <p className="font-semibold text-slate-200">{tenant.first_name} {tenant.last_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-slate-500">Bien</p>
                      <p className="font-semibold text-slate-200 truncate max-w-[150px]">{property?.title || 'Logement'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure payment information details */}
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-2xl p-4 flex gap-3 text-xs text-emerald-300 leading-relaxed">
                <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <p>
                  Votre transaction est sécurisée par <strong>Flutterwave</strong>. Réglez instantanément en toute simplicité en utilisant votre compte <strong>Mobile Money (Orange, MTN, Moov)</strong> ou votre <strong>Carte Bancaire</strong>.
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-2 space-y-3">
                <button
                  onClick={startCheckout}
                  disabled={isProcessing}
                  className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base rounded-2xl shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span>Traitement sécurisé...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Payer {formatCurrency(amountToPay)}</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-wider">Paiement 100% sécurisé et certifié conforme</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
