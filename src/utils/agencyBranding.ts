// Agency branding configuration for documents
import { supabase } from '../lib/config';

export interface AgencyBranding {
    name: string;
    logo?: string;     // base64 or URL
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    primaryColor?: string;
    secondaryColor?: string;
}

// Default branding - used as fallback
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
 * Fetch an image URL and convert it to a base64 data URI
 * Returns empty string on failure (CORS or network error)
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return '';
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
        });
    } catch {
        return '';
    }
}

/**
 * Get agency branding from database
 * @param agencyId - The agency ID
 * @returns Agency branding configuration populated from DB
 */
export async function getAgencyBranding(agencyId?: string): Promise<AgencyBranding> {
    if (!agencyId) return defaultBranding;

    try {
        const { data, error } = await supabase
            .from('agencies')
            .select('name, logo_url, address, city, phone, email')
            .eq('id', agencyId)
            .maybeSingle();

        if (error || !data) return defaultBranding;

        const branding: AgencyBranding = {
            name: data.name || defaultBranding.name,
            address: data.address || (data.city ? data.city : defaultBranding.address),
            phone: data.phone || defaultBranding.phone,
            email: data.email || defaultBranding.email,
            primaryColor: "#3B82F6",
            secondaryColor: "#6366F1",
        };

        // Fetch logo as base64 so it works in PDF / print windows (no CORS)
        if (data.logo_url) {
            const base64 = await fetchImageAsBase64(data.logo_url);
            if (base64) {
                branding.logo = base64;
            }
        }

        return branding;
    } catch {
        return defaultBranding;
    }
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
    y: number = 15
): number {
    const pageWidth = doc.internal.pageSize.width;

    // Logo image
    if (branding.logo) {
        try {
            const logoWidth = 40;
            const logoHeight = 20;
            doc.addImage(branding.logo, 'PNG', 20, y - 5, logoWidth, logoHeight);
        } catch {
            // Logo can't be added, fall through to text
        }
    }

    // Agency name
    doc.setFontSize(18);
    doc.setTextColor(branding.primaryColor || '#3B82F6');
    doc.setFont('helvetica', 'bold');
    doc.text(branding.name, pageWidth - 20, y + 5, { align: 'right' });

    y += 15;

    // Contact info
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    const contactInfo: string[] = [];
    if (branding.address) contactInfo.push(branding.address);
    if (branding.phone) contactInfo.push(`Tél: ${branding.phone}`);
    if (branding.email) contactInfo.push(branding.email);

    if (contactInfo.length > 0) {
        doc.text(contactInfo.join(' | '), pageWidth / 2, y, { align: 'center' });
        y += 8;
    }

    // Separator line
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    return y;
}

/**
 * Render agency footer for PDF documents
 */
export function renderPDFFooter(doc: any, branding: AgencyBranding): void {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const y = pageHeight - 20;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, y - 5, pageWidth - 20, y - 5);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    const footerText = `${branding.name} - ${branding.email || branding.website || ''} - Document généré le ${new Date().toLocaleDateString('fr-FR')}`;
    doc.text(footerText, pageWidth / 2, y, { align: 'center' });
}
