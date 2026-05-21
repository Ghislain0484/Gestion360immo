import { AgencyEntity } from './db';
import { MaritalStatus, PropertyTitle } from './enums';

export interface Owner extends AgencyEntity {
  id: string; // UUID
  user_id?: string | null; // UUID, FK vers auth.users(id)
  business_id?: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  property_title: PropertyTitle;
  property_title_details?: string | null;
  marital_status: MaritalStatus;
  photo_url?: string | null;
  id_card_url?: string | null;
  id_card_number?: string | null;
  spouse_name?: string | null;
  spouse_phone?: string | null;
  children_count: number;
  subscription_status?: 'active' | 'expired' | 'none';
  subscription_expires_at?: string | null;
  payment_mode?: 'retrait_physique' | 'virement_bancaire' | 'transfert_mobile' | null;
  payout_preference_day?: number | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
  bank_iban?: string | null;
  bank_swift?: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}