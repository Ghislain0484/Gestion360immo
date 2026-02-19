/**
 * Utilitaires pour calculer et afficher la complétude des profils
 */

import { Owner, Tenant, PropertyFormData } from '../types/db';

export interface CompletenessResult {
    percentage: number;
    missingFields: string[];
    completedFields: string[];
    color: 'red' | 'yellow' | 'green';
    message: string;
}

/**
 * Calcule la complétude d'un profil propriétaire
 */
export const calculateOwnerCompleteness = (owner: Partial<Owner>): CompletenessResult => {
    const fields = {
        // Champs essentiels (toujours comptés)
        first_name: { value: owner.first_name, label: 'Prénom', weight: 1 },
        last_name: { value: owner.last_name, label: 'Nom', weight: 1 },
        phone: { value: owner.phone, label: 'Téléphone', weight: 1 },
        address: { value: owner.address, label: 'Adresse', weight: 1 },
        city: { value: owner.city, label: 'Ville', weight: 1 },

        // Champs optionnels mais importants
        email: { value: owner.email, label: 'Email', weight: 0.8 },
        property_title: { value: owner.property_title, label: 'Titre de propriété', weight: 0.8 },
        marital_status: { value: owner.marital_status, label: 'Situation matrimoniale', weight: 0.5 },
    };

    // Si marié, ajouter les champs conjoint
    const allFields: Record<string, { value: any; label: string; weight: number }> = { ...fields };

    if (owner.marital_status === 'marie') {
        allFields['spouse_name'] = { value: owner.spouse_name, label: 'Nom du conjoint', weight: 0.7 };
        allFields['spouse_phone'] = { value: owner.spouse_phone, label: 'Téléphone du conjoint', weight: 0.7 };
    }

    const totalWeight = Object.values(allFields).reduce((sum, field) => sum + field.weight, 0);
    const completedWeight = Object.values(allFields)
        .filter(field => field.value && field.value.toString().trim() !== '')
        .reduce((sum, field) => sum + field.weight, 0);

    const percentage = Math.round((completedWeight / totalWeight) * 100);

    const missingFields = Object.entries(allFields)
        .filter(([_, field]) => !field.value || field.value.toString().trim() === '')
        .map(([_, field]) => field.label);

    const completedFields = Object.entries(allFields)
        .filter(([_, field]) => field.value && field.value.toString().trim() !== '')
        .map(([_, field]) => field.label);

    let color: 'red' | 'yellow' | 'green';
    let message: string;

    if (percentage < 50) {
        color = 'red';
        message = 'Profil incomplet - Veuillez compléter les informations essentielles';
    } else if (percentage < 80) {
        color = 'yellow';
        message = 'Profil partiellement complété - Quelques informations manquent';
    } else {
        color = 'green';
        message = 'Profil bien complété';
    }

    return { percentage, missingFields, completedFields, color, message };
};

/**
 * Calcule la complétude d'un profil locataire
 */
export const calculateTenantCompleteness = (tenant: Partial<Tenant>): CompletenessResult => {
    const fields = {
        // Champs essentiels
        first_name: { value: tenant.first_name, label: 'Prénom', weight: 1 },
        last_name: { value: tenant.last_name, label: 'Nom', weight: 1 },
        phone: { value: tenant.phone, label: 'Téléphone', weight: 1 },
        address: { value: tenant.address, label: 'Adresse', weight: 1 },
        city: { value: tenant.city, label: 'Ville', weight: 1 },

        // Champs optionnels mais importants
        email: { value: tenant.email, label: 'Email', weight: 0.8 },
        profession: { value: tenant.profession, label: 'Profession', weight: 0.8 },
        nationality: { value: tenant.nationality, label: 'Nationalité', weight: 0.5 },
        marital_status: { value: tenant.marital_status, label: 'Situation matrimoniale', weight: 0.5 },
        photo_url: { value: tenant.photo_url, label: 'Photo', weight: 0.6 },
        id_card_url: { value: tenant.id_card_url, label: 'Pièce d\'identité', weight: 0.7 },
    };

    // Si marié, ajouter les champs conjoint
    const allFields: Record<string, { value: any; label: string; weight: number }> = { ...fields };

    if (tenant.marital_status === 'marie') {
        allFields['spouse_name'] = { value: tenant.spouse_name, label: 'Nom du conjoint', weight: 0.7 };
        allFields['spouse_phone'] = { value: tenant.spouse_phone, label: 'Téléphone du conjoint', weight: 0.7 };
    }

    const totalWeight = Object.values(allFields).reduce((sum, field) => sum + field.weight, 0);
    const completedWeight = Object.values(allFields)
        .filter(field => field.value && field.value.toString().trim() !== '')
        .reduce((sum, field) => sum + field.weight, 0);

    const percentage = Math.round((completedWeight / totalWeight) * 100);

    const missingFields = Object.entries(allFields)
        .filter(([_, field]) => !field.value || field.value.toString().trim() === '')
        .map(([_, field]) => field.label);

    const completedFields = Object.entries(allFields)
        .filter(([_, field]) => field.value && field.value.toString().trim() !== '')
        .map(([_, field]) => field.label);

    let color: 'red' | 'yellow' | 'green';
    let message: string;

    if (percentage < 50) {
        color = 'red';
        message = 'Profil incomplet - Veuillez compléter les informations essentielles';
    } else if (percentage < 80) {
        color = 'yellow';
        message = 'Profil partiellement complété - Quelques informations manquent';
    } else {
        color = 'green';
        message = 'Profil bien complété';
    }

    return { percentage, missingFields, completedFields, color, message };
};

/**
 * Calcule la complétude d'une propriété
 */
export const calculatePropertyCompleteness = (property: Partial<PropertyFormData>): CompletenessResult => {
    const fields = {
        // Champs essentiels
        title: { value: property.title, label: 'Titre', weight: 1 },
        owner_id: { value: property.owner_id, label: 'Propriétaire', weight: 1 },
        location_commune: { value: property.location?.commune, label: 'Commune', weight: 1 },
        location_quartier: { value: property.location?.quartier, label: 'Quartier', weight: 1 },
        type: { value: property.details?.type, label: 'Type', weight: 1 },

        // Champs optionnels mais importants
        description: { value: property.description, label: 'Description', weight: 0.8 },
        rooms: { value: property.rooms && property.rooms.length > 0, label: 'Pièces', weight: 0.9 },
        images: { value: property.images && property.images.length > 0, label: 'Images', weight: 0.7 },
        location_numeroLot: { value: property.location?.numeroLot, label: 'Numéro de lot', weight: 0.4 },
        location_numeroIlot: { value: property.location?.numeroIlot, label: 'Numéro d\'îlot', weight: 0.4 },
    };

    const totalWeight = Object.values(fields).reduce((sum, field) => sum + field.weight, 0);
    const completedWeight = Object.values(fields)
        .filter(field => {
            if (typeof field.value === 'boolean') return field.value;
            return field.value && field.value.toString().trim() !== '';
        })
        .reduce((sum, field) => sum + field.weight, 0);

    const percentage = Math.round((completedWeight / totalWeight) * 100);

    const missingFields = Object.entries(fields)
        .filter(([_, field]) => {
            if (typeof field.value === 'boolean') return !field.value;
            return !field.value || field.value.toString().trim() === '';
        })
        .map(([_, field]) => field.label);

    const completedFields = Object.entries(fields)
        .filter(([_, field]) => {
            if (typeof field.value === 'boolean') return field.value;
            return field.value && field.value.toString().trim() !== '';
        })
        .map(([_, field]) => field.label);

    let color: 'red' | 'yellow' | 'green';
    let message: string;

    if (percentage < 50) {
        color = 'red';
        message = 'Propriété incomplète - Ajoutez plus de détails';
    } else if (percentage < 80) {
        color = 'yellow';
        message = 'Propriété partiellement complétée - Ajoutez des pièces et images';
    } else {
        color = 'green';
        message = 'Propriété bien documentée';
    }

    return { percentage, missingFields, completedFields, color, message };
};
