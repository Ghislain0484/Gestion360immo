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
  spouse_name?: string | null;
  spouse_phone?: string | null;
  children_count: number;
  subscription_status?: 'active' | 'expired' | 'none';
  subscription_expires_at?: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}