export interface Agency {
  id: string;
  name: string;
  commercialRegister: string;
  logo?: string;
  isAccredited: boolean;
  accreditationNumber?: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  directorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyFormData extends Omit<Agency, 'id' | 'createdAt' | 'updatedAt'> {}

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

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'director' | 'manager' | 'agent';
  agencyId: string;
  avatar?: string;
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFormData extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  password: string;
}