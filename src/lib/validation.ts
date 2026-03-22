import { z } from 'zod';

export const propertySchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères").max(100, "Le titre est trop long"),
  owner_id: z.string().uuid("Veuillez sélectionner un propriétaire"),
  agency_id: z.string().uuid(),
  description: z.string().optional(),
  monthly_rent: z.number().min(0, "Le loyer ne peut pas être négatif"),
  sale_price: z.number().min(0, "Le prix de vente ne peut pas être négatif"),
  is_available: z.boolean(),
  for_rent: z.boolean(),
  for_sale: z.boolean(),
  location: z.object({
    commune: z.string().min(2, "La commune est requise"),
    quartier: z.string().min(2, "Le quartier est requis"),
    numeroLot: z.string().optional(),
    numeroIlot: z.string().optional(),
    facilites: z.array(z.string()).default([]),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  details: z.object({
    type: z.enum(['villa', 'appartement', 'terrain_nu', 'immeuble', 'autres']),
    numeroNom: z.string().optional(),
    numeroPorte: z.string().optional(),
    titreProprietaire: z.string().optional(),
    numeroEtage: z.string().optional(),
    numeroPorteImmeuble: z.string().optional(),
    autresDetails: z.string().optional(),
  }),
  standing: z.enum(['economique', 'moyen', 'haut']).default('economique'),
});

export const tenantSchema = z.object({
  first_name: z.string().min(2, "Le prénom est requis"),
  last_name: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Email invalide").or(z.literal("")),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  id_card_number: z.string().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  employer: z.string().optional(),
  monthly_income: z.number().min(0).optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});
