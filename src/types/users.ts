import { AgencyEntity } from './db';
import { AgencyUserRole, JsonB } from './enums';

export interface User {
  id: string; // UUID, FK vers auth.users(id)
  agency_id?: string | undefined;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  avatar?: string | null;
  is_active: boolean;
  permissions: UserPermissions;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface UserPermissions {
  dashboard: boolean;
  properties: boolean;
  owners: boolean;
  tenants: boolean;
  contracts: boolean;
  collaboration: boolean;
  reports: boolean;
  notifications: boolean;
  settings: boolean;
  userManagement: boolean;
}

export interface UserFormData extends AgencyEntity {
  id?: string; // Optional for new users
  email: string;
  first_name: string;
  last_name: string;
  role: AgencyUserRole;
  //agency_id: string | null;
  permissions: UserPermissions;
  is_active: boolean;
  password?: string; // Optional for updates
}

export interface PlatformAdmin {
  id: string; // UUID
  user_id: string; // UUID, FK vers users(id)
  role: 'super_admin' | 'admin';
  permissions: JsonB;
  is_active: boolean;
  last_login?: string | null; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface AgencyUser extends AgencyEntity {
  id: string; // UUID
  user_id: string; // UUID, FK vers users(id)
  //agency_id: string; // UUID, FK vers agencies(id)
  role: AgencyUserRole;
  created_at: string; // timestamptz
  updated_at?: string; // timestamptz
}