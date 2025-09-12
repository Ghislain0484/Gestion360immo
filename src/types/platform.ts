import { JsonB } from './enums';

export interface PlatformSetting {
  id: string; // UUID
  setting_key: string;
  setting_value: JsonB;
  description?: string | null;
  category: 'subscription' | 'ranking' | 'platform';
  is_public: boolean;
  updated_by?: string | null; // UUID, FK vers users(id)
  updated_at: string; // timestamptz
  created_at: string; // timestamptz
}

export interface AuditLog {
  id: string; // UUID
  user_id?: string | null; // UUID, FK vers users(id)
  action: string;
  table_name: string;
  record_id?: string | null; // UUID
  old_values?: JsonB | null;
  new_values?: JsonB | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string; // timestamptz
}

export interface SystemAlert {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
}

export interface PlatformStats {
  totalAgencies: number;
  activeAgencies: number;
  totalRevenue: number;
  monthlyGrowth: number;
  subscriptionRevenue: number;
  totalProperties: number;
  totalContracts: number;

  pendingRequests: number;
  approvedAgencies: number;
}

export interface DashboardStats {
  totalProperties: number;
  totalOwners: number;
  totalTenants: number;
  totalContracts: number;
  monthlyRevenue: number;
  activeContracts: number;
  occupancyRate: number;
}