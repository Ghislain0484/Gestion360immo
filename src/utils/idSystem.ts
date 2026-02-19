import { format } from 'date-fns';

export type EntityType = 'PROP' | 'LOC' | 'BIEN' | 'AGEN' | 'PAYM';

/**
 * Generates a formatted slug for SEO-friendly URLs.
 * Format: {formattedId}-{nameSlug}
 * Example: PROP260130-00001-jean-dupont
 */
export const generateSlug = (id: string, name: string): string => {
    const nameSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    return `${id}-${nameSlug}`;
};

/**
 * Parses a slug to extract the ID part.
 * Assumes the ID is the first part before the first hyphen (or the whole string if no hyphen).
 * Note: This depends on the ID format NOT containing hyphens, or us strictly following the format.
 * Our format PROP260130-00001 has a hyphen, so we need to be careful.
 * 
 * Better approach: The ID is likely the UUID in the database, but we display the "Business ID".
 * If the URL contains the UUID, it's easier.
 * If the URL contains the "Business ID" (PROP...), we need to look it up.
 * 
 * For this refactor, let's assume the router uses the UUID as the primary key for data fetching,
 * but allows the "Business ID" for display/slugs. 
 * OR we pass the UUID in the URL like /proprietaires/{uuid}/{slug} which is robust.
 * 
 * However, the request asks for: /proprietaires/{propId}-{slug}
 * If propId is the Business ID, we need to lookup by Business ID.
 * If propId is UUID, it's ugly but simple.
 * 
 * Let's assume for now we use the UUID in the route for simplicity of implementation unless strict requirement otherwise.
 * "Le slug/URL doit refléter la section : /proprietaires/{propId}-{slug}"
 * 
 * Let's stick to using UUID in the route params for now to avoid massive backend changes immediately, 
 * or check if we can easily query by the custom ID.
 */
export const extractIdFromSlug = (slug: string): string => {
    // Check for UUID (36 characters: 8-4-4-4-12)
    const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    const match = slug.match(uuidPattern);
    if (match) {
        return match[0];
    }

    // Check for Custom Business ID (e.g., PROP260130-00001)
    const parts = slug.split('-');
    if (parts.length >= 2) {
        const potentialId = `${parts[0]}-${parts[1]}`;
        if (/^[A-Z]{4}\d{6}-\d{5}$/.test(potentialId)) {
            return potentialId;
        }
    }

    return parts[0]; // Fallback
};

/**
 * Formats a business ID from components (Frontend simulation)
 * In reality, this should be done by the backend.
 */
export const formatBusinessId = (type: EntityType, date: Date, sequence: number): string => {
    const dateStr = format(date, 'yyMMdd');
    const seqStr = sequence.toString().padStart(5, '0');
    return `${type}${dateStr}-${seqStr}`;
};
