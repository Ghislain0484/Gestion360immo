import { PlanType, SubscriptionStatus, RegistrationStatus, PayMethod } from './enums';

export interface Agency {
  id: string; // UUID
  name: string;
  commercial_register: string;
  logo_url?: string | null;
  is_accredited: boolean;
  accreditation_number?: string | null;
  address: string;
  city: string;
  phone: string;
  email: string;
  director_id?: string | null; // UUID, FK vers users(id)
  status: string;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface AgencyFormData {
  name: string;
  commercialRegister: string;
  logo_url: string | null;
  isAccredited: boolean;
  accreditationNumber: string | null;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export interface AgencyRegistrationRequest {
  id: string; // UUID
  agency_name: string;
  commercial_register: string;
  director_first_name: string;
  director_last_name: string;
  director_email: string;
  phone: string;
  city: string;
  address: string;
  logo_url?: string | null;
  is_accredited: boolean;
  accreditation_number?: string | null;
  status: RegistrationStatus;
  admin_notes?: string | null;
  processed_by?: string | null; // UUID, FK vers users(id)
  processed_at?: string | null; // timestamptz
  created_at: string; // timestamptz
  director_password?: string | null;
  director_auth_user_id?: string | null; // UUID, FK vers users(id)
}

export interface AgencySubscription {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
  plan_type: PlanType;
  status: SubscriptionStatus;
  suspension_reason?: string | null;
  monthly_fee: number;
  start_date: string; // date
  end_date?: string | null; // date
  last_payment_date?: string | null; // date
  next_payment_date: string; // date
  trial_days_remaining: number;
  payment_history: { amount: number; date: string }[] | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface SubscriptionPayment {
  id: string; // UUID
  subscription_id: string; // UUID, FK vers agency_subscriptions(id)
  amount: number;
  payment_date: string; // date
  payment_method: PayMethod;
  reference_number?: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processed_by?: string | null; // UUID, FK vers users(id)
  notes?: string | null;
  created_at: string; // timestamptz
}

export interface Reward {
  id: string;
  title: string;
  type: 'cash_bonus' | 'discount';
  value: number;
  description: string;
  validUntil: string;
}

export interface AgencyRanking {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
  year: number;
  rank: number;
  total_score: number;
  volume_score: number;
  recovery_rate_score: number;
  satisfaction_score: number;
  metrics: {
    totalProperties: number;
    totalContracts: number;
    totalRevenue: number;
    clientSatisfaction: number;
    collaborationScore: number;
    paymentReliability: number;
  };
  rewards: Reward[] | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}