import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { getAgencyBranding, renderPDFHeader, renderPDFFooter } from './agencyBranding';

export interface ReportSection {
    title: string;
    type: 'stats' | 'table';
    data: any[];
    columns?: { header: string; dataKey: string }[];
    summary?: { label: string; value: string | number }[];
}

export interface CombinedReportOptions {
    agencyId?: string;
    title: string;
    subtitle?: string;
    sections: ReportSection[];
}

export class PdfReportService {
    static async generateCombinedReport(options: CombinedReportOptions) {
        const { agencyId, title, subtitle, sections } = options;
        const branding = await getAgencyBranding(agencyId);
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        let y = renderPDFHeader(doc, branding, 15);

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(title.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 8;

        if (subtitle) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
            y += 12;
        }

        for (const section of sections) {
            // Check for page break
            if (y > 250) {
                doc.addPage();
                y = 20;
            }

            // Section Title
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(branding.primaryColor || '#3B82F6');
            doc.text(section.title, 20, y);
            y += 6;
            
            // Section Underline
            doc.setDrawColor(230, 230, 230);
            doc.line(20, y, 100, y);
            y += 10;

            if (section.type === 'stats' && section.summary) {
                const itemWidth = (pageWidth - 40) / 3;
                let currentX = 20;
                
                section.summary.forEach((item, index) => {
                    if (index > 0 && index % 3 === 0) {
                        y += 20;
                        currentX = 20;
                    }

                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(120, 120, 120);
                    doc.text(item.label.toUpperCase(), currentX, y);
                    
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 30, 30);
                    // Sanitize value to avoid spacing issues in PDF (e.g. non-breaking spaces)
                    const sanitizedValue = typeof item.value === 'string' ? item.value.replace(/[\u00A0\u202F]/g, ' ') : String(item.value);
                    doc.text(sanitizedValue, currentX, y + 8);
                    
                    currentX += itemWidth;
                });
                y += 25;
            }

            if (section.type === 'table' && section.columns && section.data.length > 0) {
                autoTable(doc, {
                    startY: y,
                    head: [section.columns.map(col => col.header)],
                    body: section.data.map(row => section.columns!.map(col => row[col.dataKey] ?? '')),
                    styles: { fontSize: 8, cellPadding: 3 },
                    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
                    alternateRowStyles: { fillColor: [245, 247, 250] },
                    margin: { left: 20, right: 20 },
                    didDrawPage: (data) => {
                        y = data.cursor?.y || y;
                    }
                });
                y = (doc as any).lastAutoTable.finalY + 15;
            } else if (section.type === 'table' && section.data.length === 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(150, 150, 150);
                doc.text('Aucune donnée disponible pour cette section.', 20, y);
                y += 15;
            }
        }

        renderPDFFooter(doc, branding);
        
        const timestamp = new Date().toISOString().slice(0, 10);
        doc.save(`rapport-${title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf`);
    }

    static async generateReversalStatement(options: { 
        owner: any, 
        agencyId?: string, 
        details: any 
    }) {
        const { owner, agencyId, details } = options;
        const branding = await getAgencyBranding(agencyId);
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Header
        let y = renderPDFHeader(doc, branding, 15);

        // Document Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text('BORDEREAU DE REVERSEMENT', pageWidth / 2, y, { align: 'center' });
        y += 12;

        // Info Grid (Owner & Period)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        
        // Left column
        doc.text(`PROPRIÉTAIRE :`, 20, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(`${owner.first_name} ${owner.last_name}`.toUpperCase(), 55, y);
        
        // Right column
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`PÉRIODE :`, pageWidth - 90, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        const periodText = `${new Date(details.period.startDate).toLocaleDateString('fr-FR')} au ${new Date(details.period.endDate).toLocaleDateString('fr-FR')}`;
        doc.text(periodText, pageWidth - 65, y);
        
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`ÉDITÉ LE :`, 20, y);
        doc.text(new Date().toLocaleDateString('fr-FR'), 55, y);

        y += 15;

        // Transaction Table
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(branding.primaryColor || '#3B82F6');
        doc.text('DÉTAIL DES ENCAISSEMENTS', 20, y);
        y += 5;

        const tableData = details.transactions.map((t: any) => [
            t.propertyTitle,
            t.description,
            `${new Intl.NumberFormat('fr-FR').format(t.amount)} FCFA`,
            `-${new Intl.NumberFormat('fr-FR').format(t.commission)} FCFA`,
            `${new Intl.NumberFormat('fr-FR').format(t.amount - t.commission)} FCFA`,
        ]);

        autoTable(doc, {
            startY: y,
            head: [['BIEN / UNITÉ', 'DÉSIGNATION', 'LOYER PERÇU', 'COMMISSION', 'NET PROPRIO']],
            body: tableData,
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, halign: 'center' },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right' },
            },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 20, right: 20 }
        });

        y = (doc as any).lastAutoTable.finalY + 15;

        // Summary Card
        const summaryX = pageWidth - 90;
        doc.setFillColor(245, 247, 250);
        doc.rect(summaryX, y, 70, 45, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.rect(summaryX, y, 70, 45, 'D');

        let summaryY = y + 10;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        
        doc.text('Total Loyers :', summaryX + 5, summaryY);
        doc.text(`${new Intl.NumberFormat('fr-FR').format(details.totalRent)} FCFA`, summaryX + 65, summaryY, { align: 'right' });
        
        summaryY += 8;
        doc.text('Total Commissions :', summaryX + 5, summaryY);
        doc.text(`-${new Intl.NumberFormat('fr-FR').format(details.totalCommission)} FCFA`, summaryX + 65, summaryY, { align: 'right' });
        
        if (details.totalFees > 0) {
            summaryY += 8;
            doc.text(`Frais Déductibles (${details.fees.length}) :`, summaryX + 5, summaryY);
            doc.text(`-${new Intl.NumberFormat('fr-FR').format(details.totalFees)} FCFA`, summaryX + 65, summaryY, { align: 'right' });
        }

        summaryY += 12;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text('NET À REVERSER :', summaryX + 5, summaryY);
        doc.text(`${new Intl.NumberFormat('fr-FR').format(details.netAmount)} FCFA`, summaryX + 65, summaryY, { align: 'right' });

        // Signatures
        y += 60;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text("L'AGENCE", 40, y);
        doc.text("LE PROPRIÉTAIRE", pageWidth - 80, y);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text("(Cachet et Signature)", 40, y + 5);
        doc.text("(Signature)", pageWidth - 80, y + 5);

        renderPDFFooter(doc, branding);
        
        const timestamp = new Date().toISOString().slice(0, 10);
        doc.save(`bordereau-${owner.last_name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf`);
    }
}
