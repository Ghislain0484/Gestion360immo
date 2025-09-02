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
  numeroNom?: string; // Pour villa
  numeroPorte?: string; // Pour appartement
  titreProprietaire?: string; // Pour terrain nu
  numeroEtage?: string; // Pour immeuble
  numeroPorteImmeuble?: string; // Pour immeuble
  autresDetails?: string; // Pour autres
}

export interface RoomDetails {
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
    marquePoignee: string;
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

export interface Property {
  id: string;
  ownerId: string;
  agencyId: string;
  title: string;
  description: string;
  location: PropertyLocation;
  details: PropertyDetails;
  standing: 'economique' | 'moyen' | 'haut';
  rooms: RoomDetails[];
  images: PropertyImage[];
  isAvailable: boolean;
  forSale: boolean;
  forRent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyFormData extends Omit<Property, 'id' | 'createdAt' | 'updatedAt'> {}