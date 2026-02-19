// Agency branding configuration for documents
export interface AgencyBranding {
    name: string;
    logo?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    primaryColor?: string;
    secondaryColor?: string;
}

// Default branding - can be overridden by agency settings
export const defaultBranding: AgencyBranding = {
    name: "GESTION 360 IMMO",
    address: "Abidjan, Côte d'Ivoire",
    phone: "+225 XX XX XX XX XX",
    email: "contact@gestion360immo.com",
    website: "www.gestion360immo.com",
    primaryColor: "#3B82F6", // blue-600
    secondaryColor: "#6366F1", // indigo-600
};

/**
 * Get agency branding from database or use default
 * @param agencyId - The agency ID
 * @returns Agency branding configuration
 */
export async function getAgencyBranding(agencyId?: string): Promise<AgencyBranding> {
    // TODO: Fetch from database when agency settings are implemented
    // For now, return default branding
    return defaultBranding;
}

/**
 * Render agency header for PDF documents
 * @param doc - jsPDF instance
 * @param branding - Agency branding
 * @param y - Starting Y position
 * @returns New Y position after header
 */
export function renderPDFHeader(
    doc: any,
    branding: AgencyBranding,
    y: number = 20
): number {
    const pageWidth = doc.internal.pageSize.width;

    // Logo placeholder or text
    if (branding.logo) {
        // TODO: Add logo image when implemented
        // doc.addImage(branding.logo, 'PNG', 20, y, 40, 40);
    }

    // Agency name
    doc.setFontSize(20);
    doc.setTextColor(branding.primaryColor || '#3B82F6');
    doc.text(branding.name, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Contact info
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const contactInfo = [];
    if (branding.address) contactInfo.push(branding.address);
    if (branding.phone) contactInfo.push(`Tél: ${branding.phone}`);
    if (branding.email) contactInfo.push(branding.email);

    doc.text(contactInfo.join(' | '), pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    return y;
}

/**
 * Render agency footer for PDF documents
 * @param doc - jsPDF instance
 * @param branding - Agency branding
 */
export function renderPDFFooter(doc: any, branding: AgencyBranding): void {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const y = pageHeight - 20;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y - 5, pageWidth - 20, y - 5);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerText = `${branding.name} - ${branding.website || ''} - Document généré le ${new Date().toLocaleDateString('fr-FR')}`;
    doc.text(footerText, pageWidth / 2, y, { align: 'center' });
}
