/**
 * Business ID Generator for Gestion360Immo
 * Format: TYPE-AAMMJJ-NNNNN
 * 
 * Examples:
 * - PROP260130-00001 (1st owner on Jan 30, 2026)
 * - LOC260130-00012 (12th tenant on Jan 30, 2026)
 * - BIEN260130-00045 (45th property on Jan 30, 2026)
 */

export type BusinessIdType = 'PROP' | 'LOC' | 'BIEN' | 'AGEN' | 'CONT' | 'PAIE' | 'OCCU';

export interface BusinessIdConfig {
    type: BusinessIdType;
    prefix: string;
    description: string;
}

export const BUSINESS_ID_CONFIGS: Record<BusinessIdType, BusinessIdConfig> = {
    PROP: {
        type: 'PROP',
        prefix: 'PROP',
        description: 'Propriétaire',
    },
    LOC: {
        type: 'LOC',
        prefix: 'LOC',
        description: 'Locataire',
    },
    BIEN: {
        type: 'BIEN',
        prefix: 'BIEN',
        description: 'Bien immobilier',
    },
    AGEN: {
        type: 'AGEN',
        prefix: 'AGEN',
        description: 'Agence',
    },
    CONT: {
        type: 'CONT',
        prefix: 'CONT',
        description: 'Contrat',
    },
    PAIE: {
        type: 'PAIE',
        prefix: 'PAIE',
        description: 'Paiement',
    },
    OCCU: {
        type: 'OCCU',
        prefix: 'OCCU',
        description: 'Occupation',
    },
};

/**
 * Generate date key in AAMMJJ format
 */
export function generateDateKey(date: Date = new Date()): string {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Format counter with leading zeros (5 digits)
 */
export function formatCounter(counter: number): string {
    if (counter < 1 || counter > 99999) {
        throw new Error('Counter must be between 1 and 99999');
    }
    return counter.toString().padStart(5, '0');
}

/**
 * Generate business ID
 */
export function generateBusinessId(type: BusinessIdType, counter: number, date: Date = new Date()): string {
    const config = BUSINESS_ID_CONFIGS[type];
    if (!config) {
        throw new Error(`Invalid business ID type: ${type}`);
    }

    const dateKey = generateDateKey(date);
    const formattedCounter = formatCounter(counter);

    return `${config.prefix}-${dateKey}-${formattedCounter}`;
}

/**
 * Parse business ID into components
 */
export interface ParsedBusinessId {
    type: BusinessIdType;
    prefix: string;
    year: number;
    month: number;
    day: number;
    counter: number;
    dateKey: string;
    fullId: string;
}

export function parseBusinessId(businessId: string): ParsedBusinessId | null {
    // Format: TYPE-AAMMJJ-NNNNN
    const regex = /^([A-Z]{3,4})-(\d{6})-(\d{5})$/;
    const match = businessId.match(regex);

    if (!match) {
        return null;
    }

    const [, prefix, dateKey, counterStr] = match;

    // Validate prefix
    const type = prefix as BusinessIdType;
    if (!BUSINESS_ID_CONFIGS[type]) {
        return null;
    }

    // Parse date
    const year = 2000 + parseInt(dateKey.slice(0, 2), 10);
    const month = parseInt(dateKey.slice(2, 4), 10);
    const day = parseInt(dateKey.slice(4, 6), 10);
    const counter = parseInt(counterStr, 10);

    return {
        type,
        prefix,
        year,
        month,
        day,
        counter,
        dateKey,
        fullId: businessId,
    };
}

/**
 * Validate business ID format
 */
export function isValidBusinessId(businessId: string): boolean {
    return parseBusinessId(businessId) !== null;
}

/**
 * Generate slug from text (for URLs)
 */
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .slice(0, 50); // Limit length
}

/**
 * Generate full URL slug with business ID
 * Example: PROP260130-00001-jean-dupont
 */
export function generateUrlSlug(businessId: string, name: string): string {
    const slug = generateSlug(name);
    return `${businessId}-${slug}`;
}

/**
 * Extract business ID from URL slug
 * Example: "PROP260130-00001-jean-dupont" → "PROP260130-00001"
 */
export function extractBusinessIdFromSlug(urlSlug: string): string | null {
    const regex = /^([A-Z]{3,4}-\d{6}-\d{5})/;
    const match = urlSlug.match(regex);
    return match ? match[1] : null;
}
