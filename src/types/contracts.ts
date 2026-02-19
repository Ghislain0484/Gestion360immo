import { AgencyEntity } from './db';
import { ContractType, ContractStatus, PayMethod } from './enums';

export interface Contract extends AgencyEntity {
  id: string; // UUID
  property_id: string; // UUID, FK vers properties(id)
  owner_id: string; // UUID, FK vers owners(id)
  tenant_id: string; // UUID, FK vers tenants(id)
  type: ContractType;
  start_date: string; // date
  end_date?: string | undefined; // date
  monthly_rent?: number | undefined;
  sale_price?: number | undefined;
  deposit?: number | undefined;
  charges?: number | undefined;
  commission_rate: number;
  commission_amount: number;
  status: ContractStatus;
  terms: string;
  documents: string[]; // Updated to string[] for document URLs
  created_at: string; // timestamptz
  updated_at: string; // timestamptz

  // Relations (optional as they depend on the query)
  property?: { id: string; title?: string; business_id?: string };
  tenant?: { id: string; first_name?: string; last_name?: string; business_id?: string; phone?: string };
  owner?: { id: string; first_name?: string; last_name?: string; business_id?: string; phone?: string };
}

// Interface pour les reçus de loyer
export interface RentReceipt extends AgencyEntity {
  id: string;
  receipt_number: string;       // Numéro unique (ex: REC-20250901-001)
  period_month: number;         // Mois concerné (1-12)
  period_year: number;          // Année concernée
  rent_amount: number;          // Montant du loyer hors charges
  charges?: number;             // Charges mensuelles
  total_amount: number;         // Somme loyer + charges
  payment_date: string;         // Date de paiement effectif
  payment_method: PayMethod;    // Mode de paiement
  notes?: string | null;        // Notes éventuelles (optionnel)
  issued_by: string;            // Qui a émis la quittance (ex: nom agence ou agent, UUID, FK vers users(id))
  created_at: string;           // Date de création en base, timestamptz
  commission_amount: number;    // Commission agence retenue

  // Relations pour générer une quittance
  contract_id: string;          // Lien avec le contrat
  tenant_id: string;
  property_id: string;
  owner_id: string;
  //agency_id?: string;           // Agence émettrice (optionnel si multi-agence)
  owner_payment?: number;       // Montant reversé au propriétaire
}

export interface RentReceiptWithContract extends RentReceipt {
  contracts: {
    agency_id: string;
  };
}

// Type pour le retour SQL (champs essentiels de RentReceipt)
export interface RentReceiptSummary {
  total_amount: number;
  period_month: number;  // int de DB, à convertir en string si needed (ex. '9' → 'septembre')
  period_year: number;
  contract_id?: string;
}

// Type pour revenus mensuels (utilisé dans ReportsHub)
export interface MonthlyRevenueItem {
  month: string;  // Ex. 'Sep'
  revenue: number;
  commissions: number;
}

// Met à jour DashboardStats si needed
export interface DashboardStats {
  totalProperties: number;
  totalOwners: number;
  totalTenants: number;
  totalContracts: number;
  monthlyRevenue: number;
  activeContracts: number;
  occupancyRate: number;
}

export type ContractTemplateType = 'gestion' | 'bail_habitation' | 'bail_professionnel';
export type ContractLifecycleStatus = 'draft' | 'generated' | 'validated' | 'signed' | 'archived';

export interface ContractTemplate extends AgencyEntity {
  id: string;
  name: string;
  contract_type: ContractTemplateType;
  usage_type: 'habitation' | 'professionnel' | null;
  language: 'fr' | 'en';
  version: number;
  body: string;
  variables: string[];
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractVersion extends AgencyEntity {
  id: string;
  contract_id: string;
  version_number: number;
  body: string;
  metadata: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
}

export interface ManagedContract extends AgencyEntity {
  id: string;
  contract_type: ContractTemplateType;
  owner_id: string | null;
  property_id: string | null;
  tenant_id: string | null;
  template_id: string;
  status: ContractLifecycleStatus;
  effective_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  document_url: string | null;
  financial_terms: Record<string, unknown> | null;
  context_snapshot: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyTenantAssignment extends AgencyEntity {
  id: string;
  property_id: string;
  tenant_id: string;
  status: 'active' | 'inactive' | 'terminated';
  lease_start: string;
  lease_end: string | null;
  rent_amount: number;
  charges_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
