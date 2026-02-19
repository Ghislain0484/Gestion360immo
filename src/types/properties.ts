import { AgencyEntity } from './db';
import { PropertyStanding } from './enums';

export interface PropertyLocation {
  commune: string;
  quartier: string;
  numeroLot?: string;
  numeroIlot?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  facilites: string[];
}

export interface PropertyDetails {
  type: 'villa' | 'appartement' | 'terrain_nu' | 'immeuble' | 'autres';
  numeroNom?: string;
  numeroPorte?: string;
  titreProprietaire?: string;
  numeroEtage?: string;
  numeroPorteImmeuble?: string;
  autresDetails?: string;
}

export interface RoomDetails {
  id?: string;
  type: 'sejour' | 'cuisine' | 'chambre_principale' | 'chambre_2' | 'chambre_3' | 'salle_bain' | 'wc' | 'autre';
  nom?: string;
  superficie?: number;
  plafond: {
    type: 'staff' | 'plafond_bois' | 'lambris_pvc' | 'lambris_bois' | 'dalle_simple' | 'autre';
    details?: string;
  };
  electricite: {
    nombrePrises: number;
    nombreInterrupteurs: number;
    nombreDismatique: number;
    nombreAmpoules: number;
    typeLuminaires: string;
  };
  peinture: {
    couleur: string;
    type: string;
    marque: string;
  };
  menuiserie: {
    materiau: 'bois' | 'alu';
    nombreFenetres: number;
    typeFenetres: string;
  };
  serrure: {
    typePoignee: string;
    marquePoignee?: string;
    typeCle: string;
  };
  sol: {
    type: 'carrelage' | 'parquet' | 'autre';
    details?: string;
  };
  images: PropertyImage[];
}

export interface PropertyImage {
  id: string;
  url: string;
  file?: File;
  room: string;
  description?: string;
  isPrimary: boolean;
}

export interface Property extends AgencyEntity {
  id: string; // UUID
  business_id?: string;
  owner_id: string; // UUID, FK vers owners(id)
  title: string;
  description?: string | null;
  location: PropertyLocation;
  details: PropertyDetails;
  standing: PropertyStanding;
  rooms: RoomDetails[];
  images: PropertyImage[];
  is_available: boolean;
  for_sale: boolean;
  for_rent: boolean;
  monthly_rent?: number;
  sale_price?: number;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface PropertyFormData extends Omit<Property, 'id' | 'created_at' | 'updated_at'> { }