import { MaritalStatus, PropertyTitle } from './enums';

export interface Owner {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  property_title: PropertyTitle;
  property_title_details?: string | null;
  marital_status: MaritalStatus;
  spouse_name?: string | null;
  spouse_phone?: string | null;
  children_count: number;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}