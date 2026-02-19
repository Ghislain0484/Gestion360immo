import React, { useState, useEffect } from "react";
import { dbService } from "../../lib/supabase";
import { Contract, Tenant, Owner, Property, RentReceipt } from "../../types/db";
import { PayMethod } from "../../types/enums";
import toast from "react-hot-toast";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { jsPDF } from "jspdf";
import { X, FileText, Calendar, DollarSign, CreditCard, Banknote, Receipt as ReceiptIcon } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../../contexts/AuthContext";

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

const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  isOpen,
  onClose,
  contractId,
  tenantId,
  propertyId,
  ownerId,
  onReceiptGenerated,
  preFilledData,
}) => {
  const { user } = useAuth();

  // Infos récupérées
  const [contractInfo, setContractInfo] = useState<Contract | null>(null);
  const [tenantInfo, setTenantInfo] = useState<Tenant | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<Property | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<Owner | null>(null);

  // Form state
  const [rentAmount, setRentAmount] = useState<number>(0);
  const [charges, setCharges] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("especes");
  const [notes, setNotes] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [receipt, setReceipt] = useState<RentReceipt | null>(null);

  // Charger les données liées
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          if (contractId) {
            const contract = await dbService.contracts.findOne(contractId);
            setContractInfo(contract);
            if (contract?.monthly_rent) setRentAmount(contract.monthly_rent);
          }
          if (tenantId) setTenantInfo(await dbService.tenants.findOne(tenantId));
          if (propertyId) setPropertyInfo(await dbService.properties.findOne(propertyId));
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contractId, tenantId, propertyId, ownerId]);

  // Génération quittance
  const handleGenerateReceipt = async () => {
    console.log('🔍 Starting receipt generation...');
    console.log('📋 Props:', { contractId, tenantId, propertyId, ownerId, paymentDate });
    console.log('👤 User:', { id: user?.id, agency_id: user?.agency_id });

    if (!user?.agency_id) {
      toast.error('Impossible de déterminer l\'agence');
      return;
    }

    if (!contractInfo) {
      toast.error('Contrat non trouvé');
      return;
    }

    if (!rentAmount || rentAmount <= 0) {
      toast.error('Montant du loyer invalide');
      return;
    }

    if (!paymentDate) {
      toast.error('Veuillez sélectionner une date de paiement');
      return;
    }

    setIsProcessing(true);
    const month = new Date(paymentDate).getMonth() + 1;
    const year = new Date(paymentDate).getFullYear();

    console.log('🎯 Generating receipt...');
    console.log('📅 Period:', { month, year });

    try {
      const totalAmount = rentAmount + (charges || 0);
      const commissionRate = contractInfo.commission_rate || 10; // 10% par défaut
      const commissionAmount = (totalAmount * commissionRate) / 100;
      const ownerPayment = totalAmount - commissionAmount;
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
        total_amount: totalAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes || null,
        issued_by: user.id,
        created_at: new Date().toISOString(),
        commission_amount: commissionAmount,
        owner_payment: ownerPayment,
      };

      console.log('📝 Receipt to create:', newReceipt);

      const saved = await dbService.rentReceipts.create(newReceipt);

      console.log('✅ Receipt created successfully:', saved);
      setReceipt(saved);
      toast.success("✅ Quittance générée avec succès");

      if (onReceiptGenerated) {
        await onReceiptGenerated(saved);
      }
    } catch (error: any) {
      console.error('❌ Error creating receipt:', error);
      toast.error("Erreur lors de la génération: " + error.message);
    } finally {
      setIsProcessing(false);
    }

  };

  // Export PDF
  const exportPDF = () => {
    if (!receipt) return;
    const doc = new jsPDF();

    // Logo placeholder
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text("GESTION 360 IMMO", 105, 20, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`Quittance de loyer`, 105, 35, { align: "center" });

    doc.setFontSize(10);
    doc.text(`N° ${receipt.receipt_number}`, 105, 42, { align: "center" });

    let y = 55;
    doc.setFontSize(12);
    doc.text(`Locataire: ${tenantInfo?.first_name} ${tenantInfo?.last_name}`, 20, y);
    y += 10;
    doc.text(`Propriété: ${propertyInfo?.title ?? propertyInfo?.location?.commune ?? 'N/A'}`, 20, y);
    y += 10;
    doc.text(`Période: ${receipt.period_month}/${receipt.period_year}`, 20, y);
    y += 15;
    doc.text(`Loyer: ${receipt.rent_amount.toLocaleString()} FCFA`, 20, y);
    y += 10;
    doc.text(`Charges: ${(receipt.charges || 0).toLocaleString()} FCFA`, 20, y);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${receipt.total_amount.toLocaleString()} FCFA`, 20, y);
    doc.setFont('helvetica', 'normal');
    y += 15;
    doc.text(`Payé le: ${new Date(receipt.payment_date).toLocaleDateString('fr-FR')}`, 20, y);
    y += 10;
    doc.text(`Mode: ${receipt.payment_method}`, 20, y);

    doc.save(`quittance-${receipt.receipt_number}.pdf`);
  };

  if (!isOpen) return null;

  const paymentMethods = [
    { value: 'especes', label: 'Espèces', icon: Banknote },
    { value: 'virement', label: 'Virement', icon: CreditCard },
    { value: 'cheque', label: 'Chèque', icon: ReceiptIcon },
    { value: 'mobile_money', label: 'Mobile Money', icon: DollarSign },
  ];

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
              <p className="text-sm text-gray-600 mt-1">
                Enregistrer un paiement de loyer
              </p>
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
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant du loyer (FCFA) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(Number(e.target.value))}
                    placeholder="0"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium">FCFA</span>
                  </div>
                </div>
              </div>

              {/* Charges */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Charges (FCFA)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={charges}
                  onChange={(e) => setCharges(Number(e.target.value))}
                  placeholder="0"
                />
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
                  rows={3}
                  placeholder="Informations complémentaires..."
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span className="text-gray-700">Montant total:</span>
                  <span className="text-blue-600">{(rentAmount + charges).toLocaleString('fr-FR')} FCFA</span>
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

          {/* Aperçu quittance */}
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
                    <span className="text-gray-600">Payé le:</span>
                    <p className="font-medium text-gray-900">{new Date(receipt.payment_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Mode:</span>
                    <p className="font-medium text-gray-900 capitalize">{receipt.payment_method}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={exportPDF} className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
                <Button onClick={onClose} variant="outline" className="flex-1">
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
