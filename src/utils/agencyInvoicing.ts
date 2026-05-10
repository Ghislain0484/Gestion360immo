import { jsPDF } from 'jspdf';
import { formatAmount } from './format';

interface AgencyInvoiceData {
    invoiceNumber: string;
    date: string;
    agencyName: string;
    agencyAddress?: string;
    agencyCity?: string;
    amount: number;
    type: 'commission' | 'deposit';
    description: string;
    period?: string;
    potentialRevenue?: number;
}

export async function downloadAgencyInvoicePDF(data: AgencyInvoiceData) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header - Brand
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("GESTION360", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("PLATEFORME DE GESTION IMMOBILIÈRE INTELLIGENTE", 20, 32);
    
    // Invoice Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = data.type === 'commission' ? "FACTURE DE COMMISSION FINTECH" : "REÇU DE RECHARGEMENT";
    doc.text(title, 20, 60);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° Facture : ${data.invoiceNumber}`, 20, 70);
    doc.text(`Date : ${data.date}`, 20, 75);
    
    // Client Info
    doc.setFont('helvetica', 'bold');
    doc.text("DESTINATAIRE :", 120, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(data.agencyName, 120, 75);
    if (data.agencyAddress) doc.text(data.agencyAddress, 120, 80);
    if (data.agencyCity) doc.text(data.agencyCity, 120, 85);
    
    // Main Content Table
    let y = 100;
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text("DESCRIPTION", 25, y + 7);
    doc.text("POTENTIEL", 120, y + 7);
    doc.text("MONTANT (1%)", 160, y + 7);
    
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.text(data.description, 25, y);
    
    if (data.potentialRevenue) {
        doc.text(formatAmount(data.potentialRevenue) + " FCFA", 120, y);
    } else {
        doc.text("-", 120, y);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(formatAmount(data.amount) + " FCFA", 160, y);
    
    // Total Section
    y += 30;
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(110, y, 190, y);
    
    y += 10;
    doc.setFontSize(12);
    doc.text("TOTAL À PAYER :", 110, y);
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(formatAmount(data.amount) + " FCFA", 150, y);
    
    // Footer
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.setFontSize(8);
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.text("GESTION360 - Document généré automatiquement - Merci de votre confiance.", pageWidth / 2, footerY, { align: 'center' });
    
    doc.save(`Facture-${data.invoiceNumber}.pdf`);
}
