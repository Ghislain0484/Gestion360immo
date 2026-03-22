import React, { useState, useEffect } from "react";
import { dbService } from "../../lib/supabase";
import { Contract, Tenant, Owner, Property, RentReceipt, PropertyExpense } from "../../types/db";
import { PayMethod } from "../../types/enums";
import toast from "react-hot-toast";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { X, FileText, Calendar, DollarSign, CreditCard, Banknote, Receipt as ReceiptIcon, Printer } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../../contexts/AuthContext";
import { printReceiptHTML, downloadReceiptPDF } from "../../utils/receiptActions";

export interface ReceiptGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  contractId?: string;
  tenantId: string;
  propertyId?: string;
  ownerId?: string;
  onReceiptGenerated?: (receipt: RentReceipt) => Promise<void>;
  preFilledData?: Partial<RentReceipt>;
}

const MONTHS_FR = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  isOpen,
  onClose,
  contractId,
  tenantId,
  propertyId,
  ownerId,
  onReceiptGenerated,
}) => {
  const { user } = useAuth();

  const [contractInfo, setContractInfo] = useState<Contract | null>(null);
  const [tenantInfo, setTenantInfo] = useState<Tenant | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<Property | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<Owner | null>(null);

  const [rentAmount, setRentAmount] = useState<number>(0);
  const [charges, setCharges] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("especes");
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [agencyFees, setAgencyFees] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState<PropertyExpense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);

  const [receipt, setReceipt] = useState<RentReceipt | null>(null);
  
  // States for period selection (Phase 19)
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          // Initialize period based on current or previous month
          const now = new Date();
          setPeriodMonth(now.getMonth() + 1);
          setPeriodYear(now.getFullYear());
          
          if (contractId) {
            const contract = await dbService.contracts.findOne(contractId);
            setContractInfo(contract);
            if (contract?.monthly_rent) {
              setRentAmount(contract.monthly_rent);
              setAmountPaid(contract.monthly_rent + (contract.charges || 0));
              // Si c'est un nouveau contrat (pas encore de quittances), on peut pré-remplir la caution
              if (contract.deposit) setDepositAmount(contract.deposit);
            }
            if (contract?.charges) setCharges(contract.charges);
            
            // Phase 10: Ajustement automatique de la caution si transfert
            if (contract?.deposit_provenance === 'transferred') {
              setDepositAmount(0);
            }
          }
          if (tenantId) setTenantInfo(await dbService.tenants.findOne(tenantId));
          if (propertyId) {
            const prop = await dbService.properties.findOne(propertyId);
            setPropertyInfo(prop);
            // Phase 9: Récupération des dépenses en attente
            const expenses = await dbService.propertyExpenses.getAll({ 
              property_id: propertyId, 
              status: 'pending_deduction' 
            });
            setPendingExpenses(expenses);
            setTotalExpenses(expenses.reduce((sum, e) => sum + (e.amount || 0), 0));
          }
          if (ownerId) setOwnerInfo(await dbService.owners.findOne(ownerId));
        } catch (error: any) {
          toast.error("Erreur récupération des informations: " + error.message);
        }
      };
      fetchData();
    } else {
      setContractInfo(null);
      setTenantInfo(null);
      setPropertyInfo(null);
      setOwnerInfo(null);
      setReceipt(null);
      setAmountPaid(0);
      setDepositAmount(0);
      setAgencyFees(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contractId, tenantId, propertyId, ownerId]);

  const handleGenerateReceipt = async () => {
    if (!user?.agency_id) {
      toast.error("Impossible de déterminer l'agence");
      return;
    }
    if (!contractInfo) {
      toast.error("Contrat non trouvé");
      return;
    }
    if (!rentAmount || rentAmount <= 0) {
      toast.error("Montant du loyer invalide");
      return;
    }
    if (!paymentDate) {
      toast.error("Veuillez sélectionner une date de paiement");
      return;
    }

    setIsProcessing(true);
    const month = periodMonth;
    const year = periodYear;

    try {
      // LOGIQUE COMPTABILITÉ PROFESSIONNELLE
      // 1. Le Total Encaissé est la somme de TOUT (Loyer + Charges + Caution + Frais)
      const rentWithCharges = rentAmount + (charges || 0);
      const totalToPay = rentWithCharges + depositAmount + agencyFees;
      
      // On considère que le "amountPaid" saisi par l'utilisateur est le global
      const paidAmount = amountPaid > 0 ? amountPaid : totalToPay;
      
      // 2. Calcul des Commissions : Frais de dossier (100% agence) + % sur le loyer encaissé
      const commissionRate = contractInfo.commission_rate || 10;
      
      // Ratio de paiement appliqué au loyer (si paiement partiel)
      // Note: On assume que les frais et la caution sont payés en priorité ou inclus dans le global
      const rentPaidPart = Math.max(0, Math.min(rentWithCharges, paidAmount - depositAmount - agencyFees));
      const commissionOnRent = (rentPaidPart * commissionRate) / 100;
      
      // Commission Totale Agence = Part du loyer + Frais de dossier
      const commissionAmount = commissionOnRent + agencyFees;
      
      // 3. Reversement Propriétaire = Loyer encaissé - Commission sur loyer - Dépenses/Travaux
      const ownerPayment = rentPaidPart - commissionOnRent - totalExpenses;

      const balanceDue = Math.max(0, totalToPay - paidAmount);
      const isPartial = paidAmount < totalToPay;
      
      const receiptNumber = `REC-${year}${String(month).padStart(2, '0')}-${Date.now()}`;

      const newReceipt: Partial<RentReceipt> = {
        contract_id: contractInfo.id,
        tenant_id: contractInfo.tenant_id,
        property_id: contractInfo.property_id,
        owner_id: contractInfo.owner_id,
        agency_id: user.agency_id,
        receipt_number: receiptNumber,
        period_month: month,
        period_year: year,
        rent_amount: rentAmount,
        charges: charges || 0,
        deposit_amount: depositAmount,
        agency_fees: agencyFees,
        total_amount: totalToPay,
        amount_paid: paidAmount,
        balance_due: balanceDue,
        payment_status: isPartial ? 'partial' : 'full',
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes || null,
        issued_by: user.id,
        created_at: new Date().toISOString(),
        commission_amount: commissionAmount,
        owner_payment: ownerPayment,
        expenses_deducted: totalExpenses,
      };

      const saved = await dbService.rentReceipts.create(newReceipt);
      
      // Phase 9: Marquer les dépenses comme déduites
      if (pendingExpenses.length > 0) {
        await dbService.propertyExpenses.markAsDeducted(
          pendingExpenses.map(e => e.id),
          saved.id
        );
      }
      
      setReceipt(saved);
      toast.success("✅ Quittance générée avec succès");

      if (onReceiptGenerated) {
        await onReceiptGenerated(saved);
      }
    } catch (error: any) {
      toast.error("Erreur lors de la génération: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export PDF professionnel avec logo de l'agence
  const exportPDF = async () => {
    if (!receipt || !user?.agency_id) return;
    setIsPdfLoading(true);
    await downloadReceiptPDF(receipt, user.agency_id, {
      tenantName: tenantInfo ? `${tenantInfo.first_name} ${tenantInfo.last_name}` : undefined,
      ownerName: ownerInfo ? `${ownerInfo.first_name} ${ownerInfo.last_name}` : undefined,
      propertyTitle: propertyInfo?.title || undefined
    });
    setIsPdfLoading(false);
  };

  // Impression (nouvelle fenêtre) avec logo
  const printReceipt = async () => {
    if (!receipt || !user?.agency_id) return;
    setIsPdfLoading(true);
    await printReceiptHTML(receipt, user.agency_id, {
      tenantName: tenantInfo ? `${tenantInfo.first_name} ${tenantInfo.last_name}` : undefined,
      ownerName: ownerInfo ? `${ownerInfo.first_name} ${ownerInfo.last_name}` : undefined,
      propertyTitle: propertyInfo?.title || undefined
    });
    setIsPdfLoading(false);
  };

  if (!isOpen) return null;

  const paymentMethods = [
    { value: 'especes', label: 'Espèces', icon: Banknote },
    { value: 'virement', label: 'Virement', icon: CreditCard },
    { value: 'cheque', label: 'Chèque', icon: ReceiptIcon },
    { value: 'mobile_money', label: 'Mobile Money', icon: DollarSign },
  ];

  // Calcul du net propriétaire estimé pour affichage
  const commissionRate = contractInfo?.commission_rate || 10;
  const rentWithCharges = rentAmount + charges;
  const paidAmount = amountPaid > 0 ? amountPaid : (rentWithCharges + depositAmount + agencyFees);
  const rentPaidPart = Math.max(0, Math.min(rentWithCharges, paidAmount - depositAmount - agencyFees));
  const commissionOnRent = (rentPaidPart * commissionRate) / 100;
  const estimatedOwnerPayment = rentPaidPart - commissionOnRent - totalExpenses;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Générer une quittance</h2>
              <p className="text-sm text-gray-600 mt-1">Enregistrer un paiement de loyer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Card */}
          {(contractInfo || tenantInfo || propertyInfo || ownerInfo) && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">Informations du contrat</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {tenantInfo && (
                  <div>
                    <span className="text-gray-600">Locataire:</span>
                    <p className="font-medium text-gray-900">{tenantInfo.first_name} {tenantInfo.last_name}</p>
                  </div>
                )}
                {propertyInfo && (
                  <div>
                    <span className="text-gray-600">Propriété:</span>
                    <p className="font-medium text-gray-900">{propertyInfo.title ?? propertyInfo.location.commune}</p>
                  </div>
                )}
                {ownerInfo && (
                  <div>
                    <span className="text-gray-600">Propriétaire:</span>
                    <p className="font-medium text-gray-900">{ownerInfo.first_name} {ownerInfo.last_name}</p>
                  </div>
                )}
                {contractInfo && (
                  <div>
                    <span className="text-gray-600">Loyer mensuel:</span>
                    <p className="font-medium text-gray-900">{contractInfo.monthly_rent?.toLocaleString()} FCFA</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formulaire */}
          {!receipt && (
            <div className="space-y-5">
              {/* Loyer */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loyer (FCFA) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                      value={rentAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRentAmount(val);
                        setAmountPaid(val + charges);
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Charges (FCFA)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={charges}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCharges(val);
                      setAmountPaid(rentAmount + val + depositAmount + agencyFees);
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Dépôt & Frais (Nouveau) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caution / Dépôt (FCFA)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={depositAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDepositAmount(val);
                        setAmountPaid(rentAmount + charges + val + agencyFees);
                      }}
                      placeholder="0"
                    />
                  </div>
                  {contractInfo?.deposit_provenance === 'transferred' && (
                    <p className="text-[10px] text-amber-600 mt-1 italic">
                      * Reprise de gestion : Caution déjà versée au préalable.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frais de dossier (FCFA)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ReceiptIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={agencyFees}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAgencyFees(val);
                        setAmountPaid(rentAmount + charges + depositAmount + val);
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Montant versé (paiement partiel) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant versé (FCFA) *
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    — Loyer total dû : {(rentAmount + charges).toLocaleString('fr-FR')} FCFA
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    className={clsx(
                      'w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-2 text-lg font-semibold transition-colors',
                      amountPaid < (rentAmount + charges) && amountPaid > 0
                        ? 'border-orange-400 bg-orange-50 focus:ring-orange-400 focus:border-orange-400'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    )}
                    value={amountPaid}
                    max={rentAmount + charges}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    placeholder="0"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium">FCFA</span>
                  </div>
                </div>
                {/* Badge paiement partiel */}
                {amountPaid > 0 && amountPaid < (rentAmount + charges) && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <span className="text-orange-500">⚠️</span>
                    <span>
                      <strong>Paiement partiel</strong> — Solde restant :
                      <strong className="ml-1">{(rentAmount + charges - amountPaid).toLocaleString('fr-FR')} FCFA</strong>
                    </span>
                  </div>
                )}
                {amountPaid >= (rentAmount + charges) && amountPaid > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span>✅</span>
                    <span><strong>Loyer soldé intégralement</strong></span>
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de paiement *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Période du loyer (Phase 19) */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">
                  Période du loyer
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <select
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={periodMonth}
                      onChange={(e) => setPeriodMonth(Number(e.target.value))}
                    >
                      {MONTHS_FR.map((name, i) => i > 0 && (
                        <option key={i} value={i}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={periodYear}
                      onChange={(e) => setPeriodYear(Number(e.target.value))}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-blue-600 mt-2 italic">
                  * Indiquez le mois et l'année auxquels correspond ce paiement.
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Mode de paiement *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.value;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value as PayMethod)}
                        className={clsx(
                          'flex items-center gap-3 p-3 border-2 rounded-lg transition-all duration-200',
                          isSelected
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <Icon className={clsx('w-5 h-5', isSelected ? 'text-blue-600' : 'text-gray-400')} />
                        <span className={clsx('font-medium text-sm', isSelected ? 'text-blue-900' : 'text-gray-700')}>
                          {method.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Informations complémentaires..."
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Loyer + Charges :</span>
                  <span className="font-medium">{(rentAmount + charges).toLocaleString('fr-FR')} FCFA</span>
                </div>
                {(depositAmount > 0 || agencyFees > 0) && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Caution + Frais :</span>
                    <span className="font-medium">{(depositAmount + agencyFees).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                  <span className="text-gray-700">TOTAL À PERCEVOIR :</span>
                  <span className="text-blue-600">{(rentAmount + charges + depositAmount + agencyFees).toLocaleString('fr-FR')} FCFA</span>
                </div>
                
                {/* Phase 9: Affichage des déductions travaux */}
                {totalExpenses > 0 && (
                  <div className="bg-amber-50 rounded p-2 border border-amber-100 mt-2">
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Déductions Propriétaire (Travaux)</p>
                    {pendingExpenses.map(e => (
                      <div key={e.id} className="flex justify-between text-xs text-amber-700">
                        <span>• {e.description}</span>
                        <span>-{e.amount.toLocaleString('fr-FR')}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-amber-800 border-t border-amber-200 mt-1 pt-1">
                      <span>Total Déductions</span>
                      <span>-{totalExpenses.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-base font-bold text-gray-800 bg-gray-100 p-2 rounded mt-2">
                  <div className="flex flex-col">
                    <span>Montant encaissé :</span>
                    <span className="text-[10px] font-normal text-gray-500 italic">Net Propriétaire estimé: {estimatedOwnerPayment.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <span className="text-indigo-700">{amountPaid.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleGenerateReceipt}
                  disabled={isProcessing || !paymentDate}
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? "Génération..." : "Générer la quittance"}
                </button>
              </div>
            </div>
          )}

          {/* Aperçu quittance générée */}
          {receipt && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">Quittance générée avec succès!</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Numéro:</span>
                    <p className="font-medium text-gray-900">{receipt.receipt_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Montant total:</span>
                    <p className="font-medium text-gray-900">{receipt.total_amount.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Période:</span>
                    <p className="font-medium text-gray-900">{MONTHS_FR[receipt.period_month] || receipt.period_month} {receipt.period_year}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Payé le:</span>
                    <p className="font-medium text-gray-900">{new Date(receipt.payment_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={exportPDF} className="flex-1" isLoading={isPdfLoading}>
                  <FileText className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
                <Button onClick={printReceipt} variant="outline" className="flex-1" isLoading={isPdfLoading}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
                <Button onClick={onClose} variant="ghost" className="flex-1">
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ReceiptGenerator;
