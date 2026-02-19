/**
 * Utilitaires de validation permissifs pour l'application Gestion360Immo
 * Permet une saisie rapide tout en maintenant une validation de base
 */

/**
 * Validation téléphone permissive pour Côte d'Ivoire
 * Accepte: +225XXXXXXXXXX, 225XXXXXXXXXX, 0XXXXXXXXX, XXXXXXXXXX
 */
export const validatePhoneCI = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-().]/g, '');
  // Accepte différents formats ivoiriens
  return /^(\+?225)?[0-9]{8,10}$/.test(cleaned);
};

/**
 * Validation email permissive
 * Retourne true si vide (optionnel) ou si format valide
 */
export const validateEmail = (email: string | null | undefined): boolean => {
  if (!email || email.trim() === '') return true; // Optionnel
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validation conditionnelle pour formulaires
 * Permet de valider un champ seulement s'il est requis
 */
export const validateFormField = (
  value: any,
  required: boolean,
  validator?: (val: any) => boolean
): boolean => {
  // Si non requis et vide, c'est valide
  if (!required && (!value || value === '')) return true;
  
  // Si requis et vide, c'est invalide
  if (required && (!value || value === '')) return false;
  
  // Si un validateur est fourni, l'utiliser
  return validator ? validator(value) : true;
};

/**
 * Formatte un numéro de téléphone ivoirien
 * Retourne le format: +225 XX XX XX XX XX
 */
export const formatPhoneCI = (phone: string): string => {
  const cleaned = phone.replace(/[\s\-().]/g, '');
  
  // Si commence par +225
  if (cleaned.startsWith('+225')) {
    const number = cleaned.substring(4);
    return `+225 ${number.substring(0, 2)} ${number.substring(2, 4)} ${number.substring(4, 6)} ${number.substring(6, 8)} ${number.substring(8)}`;
  }
  
  // Si commence par 225
  if (cleaned.startsWith('225')) {
    const number = cleaned.substring(3);
    return `+225 ${number.substring(0, 2)} ${number.substring(2, 4)} ${number.substring(4, 6)} ${number.substring(6, 8)} ${number.substring(8)}`;
  }
  
  // Si commence par 0
  if (cleaned.startsWith('0')) {
    const number = cleaned.substring(1);
    return `+225 ${number.substring(0, 2)} ${number.substring(2, 4)} ${number.substring(4, 6)} ${number.substring(6, 8)} ${number.substring(8)}`;
  }
  
  // Format par défaut
  return `+225 ${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8)}`;
};

/**
 * Vérifie si une chaîne est vide ou null/undefined
 */
export const isEmpty = (value: any): boolean => {
  return value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');
};

/**
 * Validation pour les montants (loyers, prix, etc.)
 * Accepte 0 ou vide pour les brouillons
 */
export const validateAmount = (amount: number | undefined | null, required: boolean = false): boolean => {
  if (!required && (amount === undefined || amount === null || amount === 0)) return true;
  if (required && (amount === undefined || amount === null || amount <= 0)) return false;
  return amount >= 0;
};
