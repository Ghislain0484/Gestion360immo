export interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  propertyTitle: 'attestation_villageoise' | 'lettre_attribution' | 'permis_habiter' | 'acd' | 'tf' | 'cpf' | 'autres';
  propertyTitleDetails?: string; // Pour "autres"
  maritalStatus: 'celibataire' | 'marie' | 'divorce' | 'veuf';
  spouseName?: string;
  spousePhone?: string;
  childrenCount: number;
  agencyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnerFormData extends Omit<Owner, 'id' | 'createdAt' | 'updatedAt'> {}