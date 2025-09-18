import { AgencyEntity } from "./db";

export interface FinancialTransaction extends AgencyEntity {
  id: string; // UUID
  //agency_id: string; // UUID, FK vers agencies(id)
  owner_id?: string | null; // UUID, FK vers owners(id)
  entity_type: 'owner' | 'tenant';
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string; // date
  property_id?: string | null; // UUID, FK vers properties(id)
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface FinancialStatement extends AgencyEntity {
  id: string; // UUID
  //agency_id: string; // UUID, FK vers agencies(id)
  owner_id?: string | null; // UUID, FK vers owners(id)
  tenant_id?: string | null; // UUID, FK vers tenants(id)
  entity_type: 'owner' | 'tenant';
  period: { start_date: string; end_date: string };
  summary: {
    total_income: number;
    total_expenses: number;
    balance: number;
    pending_payments: number;
  };
  transactions: FinancialTransaction[];
  generated_by: string; // UUID, FK vers users(id)
  generated_at: string; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}