import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { RentReceipt } from '../types/db';
import { getAgencyBranding, renderPDFHeader, renderPDFFooter } from './agencyBranding';

const MONTHS_FR = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    especes: 'Espèces',
    cheque: 'Chèque',
    virement: 'Virement bancaire',
    mobile_money: 'Mobile Money',
    bank_transfer: 'Virement bancaire',
    cash: 'Espèces',
    check: 'Chèque',
  };
  return labels[method] || method;
};

export async function downloadReceiptPDF(receipt: RentReceipt, agencyId: string, extraInfo: { tenantName?: string; ownerName?: string; propertyTitle?: string } = {}) {
  try {
    const branding = await getAgencyBranding(agencyId);
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

    drawSection("BAILLEUR (Propriétaire)", [
      extraInfo.ownerName || "N/A",
      branding.name + " (Agence Gestionnaire)",
      branding.address || "",
      `Tél : ${branding.phone || "N/A"}`,
    ]);

    drawSection("LOCATAIRE", [
      extraInfo.tenantName || "N/A",
    ]);

    drawSection("BIEN IMMOBILIER", [
      extraInfo.propertyTitle || "N/A",
    ]);

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
    drawRow("Loyer total dû :", `${receipt.total_amount.toLocaleString('fr-FR')} FCFA`);

    doc.setDrawColor(59, 130, 246);
    doc.line(col1, y, pageWidth - 20, y);
    y += 6;

    const amountPaid = receipt.amount_paid ?? receipt.total_amount;
    const balanceDue = receipt.balance_due ?? 0;
    drawRow("MONTANT VERSÉ :", `${amountPaid.toLocaleString('fr-FR')} FCFA`, true);
    if (balanceDue > 0) {
      doc.setTextColor(220, 50, 50);
      drawRow("SOLDE RESTANT :", `${balanceDue.toLocaleString('fr-FR')} FCFA`, true);
      doc.setTextColor(30, 30, 30);
    }
    y += 4;

    drawRow("Date de paiement :", new Date(receipt.payment_date).toLocaleDateString('fr-FR'));
    drawRow("Mode de paiement :", getPaymentMethodLabel(receipt.payment_method));

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

    renderPDFFooter(doc, branding);
    doc.save(`quittance-${receipt.receipt_number}.pdf`);
    toast.success("PDF téléchargé !");
  } catch (err: any) {
    toast.error("Erreur PDF : " + err.message);
  }
}

export async function printReceiptHTML(receipt: RentReceipt, agencyId: string, extraInfo: { tenantName?: string; ownerName?: string; propertyTitle?: string } = {}) {
  try {
    const branding = await getAgencyBranding(agencyId);
    const logoHtml = branding.logo ? `<img src="${branding.logo}" alt="Logo" style="max-height:70px; object-fit:contain;">` : '';
    const periodStr = `${MONTHS_FR[receipt.period_month] || receipt.period_month} ${receipt.period_year}`;
    const pmLabel = getPaymentMethodLabel(receipt.payment_method);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Fenêtre d'impression bloquée");
      return;
    }

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
      <div style="font-size: 10px; color: #666; margin-top: 4px;">${[branding.address, branding.phone ? 'Tél: ' + branding.phone : '', branding.email].filter(Boolean).join(' | ')}</div>
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
    ${extraInfo.ownerName || 'N/A'}<br>
    Agence gestionnaire : ${branding.name}
  </div>

  <div class="section-title">LOCATAIRE</div>
  <div class="section-content">
    ${extraInfo.tenantName || 'N/A'}
  </div>

  <div class="section-title">BIEN IMMOBILIER</div>
  <div class="section-content">
    ${extraInfo.propertyTitle || 'N/A'}
  </div>

  <div class="section-title">DÉTAIL DU PAIEMENT</div>
  <table class="payment-table">
    <tr><td>Loyer mensuel</td><td style="text-align:right">${receipt.rent_amount.toLocaleString('fr-FR')} FCFA</td></tr>
    <tr><td>Charges</td><td style="text-align:right">${(receipt.charges || 0).toLocaleString('fr-FR')} FCFA</td></tr>
    <tr><td>Loyer total dû</td><td style="text-align:right">${receipt.total_amount.toLocaleString('fr-FR')} FCFA</td></tr>
    <tr class="total-row"><td>MONTANT VERSÉ</td><td style="text-align:right;color:#16a34a">${(receipt.amount_paid ?? receipt.total_amount).toLocaleString('fr-FR')} FCFA</td></tr>
    ${(receipt.balance_due ?? 0) > 0 ? `<tr><td style="color:#dc2626;font-weight:bold">SOLDE RESTANT</td><td style="text-align:right;color:#dc2626;font-weight:bold">${(receipt.balance_due ?? 0).toLocaleString('fr-FR')} FCFA</td></tr>` : ''}
    <tr><td>Date de paiement</td><td style="text-align:right">${new Date(receipt.payment_date).toLocaleDateString('fr-FR')}</td></tr>
    <tr><td>Mode de paiement</td><td style="text-align:right">${pmLabel}</td></tr>
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
  }
}
