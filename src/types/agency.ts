// src/types/agency.ts
export type AgencyFormData = {
  name: string;
  commercialRegister: string;
  logo: string;
  isAccredited: boolean;
  accreditationNumber?: string | null;
  address: string;
  city: string;
  phone: string;
  email: string;
  directorId?: string;
};

export type UserPermissions = {
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
};

export type UserFormData = {
  email: string;
  firstName: string;
  lastName: string;
  role: 'director' | 'manager' | 'agent' | 'viewer';
  agencyId?: string;
  permissions: UserPermissions;
  isActive: boolean;
  password?: string;
};
