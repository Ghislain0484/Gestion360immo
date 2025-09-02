/*export interface PlatformAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin';
  permissions: AdminPermissions;
  createdAt: Date;
}*/
export interface PlatformAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin';
  permissions: {
    agencyManagement: boolean;
    subscriptionManagement: boolean;
    platformSettings: boolean;
    reports: boolean;
    userSupport: boolean;
    systemMaintenance: boolean;
    dataExport: boolean;
    auditAccess: boolean;
  };
  createdAt: Date;
}

/*
export interface AdminPermissions {
  agencyManagement: boolean;
  subscriptionManagement: boolean;
  platformSettings: boolean;
  reports: boolean;
  userSupport: boolean;
}
  */

export interface AgencySubscription {
  id: string;
  agencyId: string;
  planType: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  monthlyFee: number;
  startDate: Date;
  endDate: Date;
  lastPaymentDate?: Date;
  nextPaymentDate: Date;
  isActive: boolean;
  trialDaysRemaining?: number;
}

export interface AgencyRanking {
  id: string;
  agencyId: string;
  period: string; // "2024-S1", "2024-S2"
  rank: number;
  score: number;
  metrics: {
    totalProperties: number;
    totalContracts: number;
    totalRevenue: number;
    clientSatisfaction: number;
    collaborationScore: number;
    paymentReliability: number;
  };
  rewards: AgencyReward[];
  createdAt: Date;
}

export interface AgencyReward {
  id: string;
  type: 'discount' | 'feature_unlock' | 'badge' | 'cash_bonus';
  title: string;
  description: string;
  value: number;
  validUntil: Date;
}

export interface PlatformStats {
  totalAgencies: number;
  activeAgencies: number;
  totalProperties: number;
  totalContracts: number;
  totalRevenue: number;
  monthlyGrowth: number;
  subscriptionRevenue: number;

  // 👉 nouveaux champs by AOC
  pendingRequests: number;
  approvedAgencies: number;
}

// AJOUT By AOC

export interface Agency {
  id: string;
  name: string;
  city: string;
  phone: string;
  email: string;
  plan_type: string;
  subscription_status: string;
  monthly_fee: number;
  created_at: string;
  commercial_register?: string;
}

export type AgencyStatus = "active" | "suspended" | "inactive";

export interface RegistrationRequest {
  id: string;
  agency_name: string;
  city: string;
  address: string;
  phone: string;
  director_first_name: string;
  director_last_name: string;
  director_email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at?: string;
}
