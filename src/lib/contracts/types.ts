import { Agency, Owner, Property, Tenant } from '../../types/db';
import { ContractTemplateType } from '../../types/contracts';

export interface ContractFinancialTerms {
  monthlyRent: number;
  rentCurrency: 'XOF';
  securityDeposit: number;
  advancePayment: number;
  agencyFees: number;
  totalDueAtSignature: number;
  charges?: number;
  commissionRate?: number;
  commissionAmount?: number;
  maintenanceThreshold?: number;
  defaultCommissionText?: string;
  paymentDay?: string;
  paymentTerms?: string;
}

export interface ContractGenerationContext {
  agency: Agency;
  owner?: Owner | null;
  property?: Property | null;
  tenant?: Tenant | null;
  contractType: ContractTemplateType;
  usageType?: 'habitation' | 'professionnel' | null;
  effectiveDate: string;
  endDate?: string | null;
  renewalNoticeMonths?: number;
  locationJurisdiction?: string;
  financialTerms?: ContractFinancialTerms;
  customClauses?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface RenderedContract {
  templateId: string | null;
  contractType: ContractTemplateType;
  usageType: 'habitation' | 'professionnel' | null;
  title: string;
  html: string;
  variables: string[];
  financialTerms: ContractFinancialTerms | null;
  metadata: Record<string, unknown> | null;
}
