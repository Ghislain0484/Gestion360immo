export interface Contract {
  id: string;
  propertyId: string;
  ownerId: string;
  tenantId: string;
  agencyId: string;
  type: 'location' | 'vente' | 'gestion';
  startDate: Date;
  endDate?: Date;
  monthlyRent?: number;
  salePrice?: number;
  deposit?: number;
  charges?: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';
  terms: string;
  documents: ContractDocument[];
  renewalHistory: ContractRenewal[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractDocument {
  id: string;
  contractId: string;
  name: string;
  type: 'contract' | 'inventory' | 'insurance' | 'other';
  url: string;
  uploadedAt: Date;
}

export interface ContractRenewal {
  id: string;
  contractId: string;
  previousEndDate: Date;
  newEndDate: Date;
  newRent?: number;
  renewalDate: Date;
  notes?: string;
}

export interface ContractFormData extends Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> {}