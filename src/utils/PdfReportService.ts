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
}
