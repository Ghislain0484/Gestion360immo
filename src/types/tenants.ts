import { AgencyEntity } from './db';
import { MaritalStatus, PaymentReliability } from './enums';

export interface Tenant extends AgencyEntity {
  id: string; // UUID
  business_id?: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  marital_status: MaritalStatus;
  spouse_name?: string | null;
  spouse_phone?: string | null;
  children_count: number;
  profession: string;
  nationality: string;
  photo_url?: string | null;
  id_card_url?: string | null;
  payment_status: PaymentReliability;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export type TenantFormData = Omit<Tenant, 'id' | 'created_at' | 'updated_at'>;

export interface TenantFilters extends AgencyEntity {
  limit?: number;
  offset?: number;
  search?: string;
  marital_status?: MaritalStatus;
  payment_status?: PaymentReliability;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  agencyId: string;
  startDate: Date;
  endDate?: Date;
  monthlyRent: number;
  deposit: number;
  status: 'actif' | 'termine' | 'resilie';
  renewalHistory: RenewalRecord[];
  paymentHistory: PaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RenewalRecord {
  id: string;
  rentalId: string;
  previousEndDate: Date;
  newEndDate: Date;
  newRent?: number;
  renewalDate: Date;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  rentalId: string;
  month: string;
  year: number;
  amount: number;
  paidDate?: Date;
  dueDate: Date;
  status: 'paye' | 'retard' | 'impaye';
  paymentMethod?: 'especes' | 'cheque' | 'virement' | 'mobile_money';
  notes?: string;
  createdAt: Date;
}

export interface TenantWithRental extends Tenant {
  contractId?: string;
  propertyId?: string;
  ownerId?: string;
}
