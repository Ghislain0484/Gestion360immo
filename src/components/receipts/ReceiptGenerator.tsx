import React, { useState, useEffect } from "react";
import { dbService } from "../../lib/supabase";
import { Contract, Tenant, Owner, Property, RentReceipt } from "../../types/db";
import { PayMethod } from "../../types/enums";
import toast from "react-hot-toast";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { jsPDF } from "jspdf";
import { X, FileText, Calendar, DollarSign, CreditCard, Banknote, Receipt as ReceiptIcon, Printer } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../../contexts/AuthContext";
import { getAgencyBranding, renderPDFHeader, renderPDFFooter } from "../../utils/agencyBranding";

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
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("especes");
  const [notes, setNotes] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const [receipt, setReceipt] = useState<RentReceipt | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          if (contractId) {
            const contract = await dbService.contracts.findOne(contractId);
            setContractInfo(contract);
            if (contract?.monthly_rent) setRentAmount(contract.monthly_rent);
            if (contract?.charges) setCharges(contract.charges);
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
    const month = new Date(paymentDate).getMonth() + 1;
    const year = new Date(paymentDate).getFullYear();

    try {
      const totalAmount = rentAmount + (charges || 0);
      const commissionRate = contractInfo.commission_rate || 10;
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

      const saved = await dbService.rentReceipts.create(newReceipt);
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
    if (!receipt) return;
    setIsPdfLoading(true);
    try {
      const branding = await getAgencyBranding(user?.agency_id ?? undefined);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // En-tête avec logo
      let y = renderPDFHeader(doc, branding, 15);

      // Titre
      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text("QUITTANCE DE LOYER", pageWidth / 2, y, { align: 'center' });
      y += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`N° ${receipt.receipt_number}`, pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Période et date
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      const periodStr = `Période : ${MONTHS_FR[receipt.period_month] || receipt.period_month} ${receipt.period_year}`;
      doc.text(periodStr, 20, y);
      doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 20, y, { align: 'right' });
      y += 12;

      // Séparateur
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      // Parties
      const drawSection = (title: string, lines: string[]) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text(title, 20, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        lines.forEach(line => {
          doc.text(line, 25, y);
          y += 6;
        });
        y += 4;
      };

      // Bailleur / Propriétaire
      drawSection("BAILLEUR (Propriétaire)", [
        ownerInfo ? `${ownerInfo.first_name} ${ownerInfo.last_name}` : "N/A",
        branding.name + " (Agence Gestionnaire)",
        branding.address || "",
        `Tél : ${branding.phone || "N/A"}`,
      ]);

      // Locataire
      drawSection("LOCATAIRE", [
        tenantInfo ? `${tenantInfo.first_name} ${tenantInfo.last_name}` : "N/A",
        tenantInfo?.phone ? `Tél : ${tenantInfo.phone}` : "",
      ].filter(Boolean));

      // Bien loué
      drawSection("BIEN IMMOBILIER", [
        propertyInfo ? (propertyInfo.title || `${propertyInfo.location?.quartier || ''}, ${propertyInfo.location?.commune || ''}`) : "N/A",
        propertyInfo?.location?.commune ? `Commune : ${propertyInfo.location.commune}` : "",
      ].filter(Boolean));

      // Séparateur
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      // Détail du paiement
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text("DÉTAIL DU PAIEMENT", 20, y);
      y += 10;

      const col1 = 20;
      const col2 = 130;

      const drawRow = (label: string, value: string, bold = false) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(label, col1, y);
        doc.setTextColor(30, 30, 30);
        doc.text(value, col2, y);
        y += 8;
      };

      drawRow("Loyer mensuel :", `${receipt.rent_amount.toLocaleString('fr-FR')} FCFA`);
      drawRow("Charges :", `${(receipt.charges || 0).toLocaleString('fr-FR')} FCFA`);

      // Ligne de total
      doc.setDrawColor(59, 130, 246);
      doc.line(col1, y, pageWidth - 20, y);
      y += 6;
      drawRow("TOTAL PAYÉ :", `${receipt.total_amount.toLocaleString('fr-FR')} FCFA`, true);
      y += 4;

      drawRow("Date de paiement :", new Date(receipt.payment_date).toLocaleDateString('fr-FR'));
      const pmLabelExport = ({
        especes: 'Espèces',
        cheque: 'Chèque',
        virement: 'Virement bancaire',
        mobile_money: 'Mobile Money',
        bank_transfer: 'Virement bancaire',
        cash: 'Espèces',
        check: 'Chèque',
      } as Record<string, string>)[receipt.payment_method] || receipt.payment_method;
      drawRow("Mode de paiement :", pmLabelExport);

      if (receipt.notes) {
        drawRow("Notes :", receipt.notes);
      }

      y += 8;

      // Mention légale
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(18, y, pageWidth - 36, 22, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Je soussigné(e), agence gestionnaire, certifie avoir reçu la somme ci-dessus indiquée",
        pageWidth / 2, y + 8, { align: 'center' }
      );
      doc.text(
        `à titre de loyer pour le mois de ${MONTHS_FR[receipt.period_month] || receipt.period_month} ${receipt.period_year}.`,
        pageWidth / 2, y + 15, { align: 'center' }
      );
      y += 32;

      // Signature
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text("Signature et cachet de l'agence :", 20, y);
      doc.text(`Fait à ______________________, le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 20, y, { align: 'right' });

      // Pied de page
      renderPDFFooter(doc, branding);

      doc.save(`quittance-${receipt.receipt_number}.pdf`);
      toast.success("PDF téléchargé !");
    } catch (err: any) {
      toast.error("Erreur PDF : " + err.message);
    } finally {
      setIsPdfLoading(false);
    }
  };

  // Impression (nouvelle fenêtre) avec logo
  const printReceipt = async () => {
    if (!receipt) return;
    setIsPdfLoading(true);
    try {
      const branding = await getAgencyBranding(user?.agency_id ?? undefined);
      const logoHtml = branding.logo ? `<img src="${branding.logo}" alt="Logo" style="max-height:70px; object-fit:contain;">` : '';

      const periodStr = `${MONTHS_FR[receipt.period_month] || receipt.period_month} ${receipt.period_year}`;
      const pmLabel = ({ especes: 'Espèces', cheque: 'Chèque', virement: 'Virement bancaire', mobile_money: 'Mobile Money', bank_transfer: 'Virement bancaire', cash: 'Espèces', check: 'Chèque' } as Record<string, string>)[receipt.payment_method] || receipt.payment_method;

      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error("Fenêtre d'impression bloquée"); return; }

      printWindow.document.write(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Quittance ${receipt.receipt_number}</title>
  <style>
    body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #1a1a1a; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3B82F6; padding-bottom: 15px; margin-bottom: 15px; }
    .agency-info { text-align: right; }
    .agency-name { font-size: 18px; font-weight: bold; color: #3B82F6; }
    .agency-contact { font-size: 10px; color: #666; margin-top: 4px; }
    h1 { text-align: center; font-size: 20px; color: #1a1a1a; margin: 10px 0 4px; }
    .receipt-num { text-align: center; color: #666; margin-bottom: 15px; }
    .period-row { display: flex; justify-content: space-between; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-bottom: 15px; font-weight: bold; }
    .section-title { color: #3B82F6; font-weight: bold; font-size: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 12px 0 8px; }
    .section-content { padding-left: 15px; color: #444; line-height: 1.7; }
    .payment-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .payment-table td { padding: 6px 10px; }
    .payment-table tr:nth-child(even) { background: #f8fafc; }
    .total-row td { border-top: 2px solid #3B82F6; font-weight: bold; font-size: 14px; padding-top: 8px; }
    .mention { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center; font-style: italic; color: #555; margin: 15px 0; }
    .signature-row { display: flex; justify-content: space-between; margin-top: 25px; }
    .signature-box { border-top: 1px solid #aaa; padding-top: 5px; width: 45%; text-align: center; color: #666; font-size: 11px; }
    .footer { border-top: 1px solid #ddd; margin-top: 20px; padding-top: 8px; text-align: center; color: #999; font-size: 9px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>${logoHtml}</div>
    <div class="agency-info">
      <div class="agency-name">${branding.name}</div>
      <div class="agency-contact">${[branding.address, branding.phone ? 'Tél: ' + branding.phone : '', branding.email].filter(Boolean).join(' | ')}</div>
    </div>
  </div>

  <h1>QUITTANCE DE LOYER</h1>
  <div class="receipt-num">N° ${receipt.receipt_number}</div>

  <div class="period-row">
    <span>Période : ${periodStr}</span>
    <span>Date d'émission : ${new Date().toLocaleDateString('fr-FR')}</span>
  </div>

  <div class="section-title">BAILLEUR / PROPRIÉTAIRE</div>
  <div class="section-content">
    ${ownerInfo ? `${ownerInfo.first_name} ${ownerInfo.last_name}` : 'N/A'}<br>
    Agence gestionnaire : ${branding.name}
  </div>

  <div class="section-title">LOCATAIRE</div>
  <div class="section-content">
    ${tenantInfo ? `${tenantInfo.first_name} ${tenantInfo.last_name}` : 'N/A'}
    ${tenantInfo?.phone ? `<br>Tél : ${tenantInfo.phone}` : ''}
  </div>

  <div class="section-title">BIEN IMMOBILIER</div>
  <div class="section-content">
    ${propertyInfo ? (propertyInfo.title || `${propertyInfo.location?.quartier || ''}, ${propertyInfo.location?.commune || ''}`) : 'N/A'}
    ${propertyInfo?.location?.commune ? `<br>Commune : ${propertyInfo.location.commune}` : ''}
  </div>

  <div class="section-title">DÉTAIL DU PAIEMENT</div>
  <table class="payment-table">
    <tr><td>Loyer mensuel</td><td style="text-align:right">${receipt.rent_amount.toLocaleString('fr-FR')} FCFA</td></tr>
    <tr><td>Charges</td><td style="text-align:right">${(receipt.charges || 0).toLocaleString('fr-FR')} FCFA</td></tr>
    <tr class="total-row"><td>TOTAL PAYÉ</td><td style="text-align:right">${receipt.total_amount.toLocaleString('fr-FR')} FCFA</td></tr>
    <tr><td>Date de paiement</td><td style="text-align:right">${new Date(receipt.payment_date).toLocaleDateString('fr-FR')}</td></tr>
    <tr><td>Mode de paiement</td><td style="text-align:right">${pmLabel}</td></tr>
    ${receipt.notes ? `<tr><td>Notes</td><td style="text-align:right">${receipt.notes}</td></tr>` : ''}
  </table>

  <div class="mention">
    Je soussigné(e), agence gestionnaire, certifie avoir reçu la somme ci-dessus indiquée<br>
    à titre de loyer pour le mois de ${periodStr}.
  </div>

  <div class="signature-row">
    <div class="signature-box">Signature du locataire</div>
    <div class="signature-box">Signature et cachet de l'agence</div>
  </div>

  <div class="footer">${branding.name} &bull; ${branding.email || ''} &bull; Document généré le ${new Date().toLocaleDateString('fr-FR')}</div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`);
      printWindow.document.close();
    } catch (err: any) {
      toast.error("Erreur impression : " + err.message);
    } finally {
      setIsPdfLoading(false);
    }
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
