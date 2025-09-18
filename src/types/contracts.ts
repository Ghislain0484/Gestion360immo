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
}

// Interface pour les reçus de loyer
export interface RentReceipt extends AgencyEntity {
  id: string;
  receipt_number: string;       // Numéro unique (ex: REC-20250901-001)
  period_month: string;         // Mois concerné (ex: "septembre")
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