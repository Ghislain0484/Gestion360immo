export interface Contract {
  id: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  agency_id: string;
  type: 'location' | 'vente' | 'gestion';
  start_date: Date;
  end_date?: Date;
  monthly_rent?: number;
  sale_price?: number;
  deposit?: number;
  charges?: number;
  commission_rate: number;
  commission_amount: number;
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';
  terms: string;
  documents: ContractDocument[];
  renewal_history: ContractRenewal[];
  created_at: Date;
  updated_at: Date;
}

export interface ContractDocument {
  id: string;
  contract_id: string;
  name: string;
  type: 'contract' | 'inventory' | 'insurance' | 'other';
  url: string;
  uploaded_at: Date;
}

export interface ContractRenewal {
  id: string;
  contract_id: string;
  previous_end_date: Date;
  new_end_date: Date;
  new_rent?: number;
  renewal_date: Date;
  notes?: string;
}
