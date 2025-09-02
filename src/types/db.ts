// types/db.ts

// ENUM Types
export type AgencyUserRole = 'director' | 'manager' | 'agent';
export type PlanType = 'basic' | 'premium' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled';
export type MaritalStatus = 'celibataire' | 'marie' | 'divorce' | 'veuf';
export type PaymentReliability = 'bon' | 'irregulier' | 'mauvais';
export type ContractType = 'location' | 'vente' | 'gestion';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';
export type AnnouncementType = 'location' | 'vente';
export type PayMethod = 'especes' | 'cheque' | 'virement' | 'mobile_money' | 'bank_transfer' | 'cash' | 'check';
export type NotifType = 'rental_alert' | 'payment_reminder' | 'new_message' | 'property_update' | 'contract_expiry' | 'new_interest';
export type NotifPriority = 'low' | 'medium' | 'high';
export type PropertyTitle = 'attestation_villageoise' | 'lettre_attribution' | 'permis_habiter' | 'acd' | 'tf' | 'cpf' | 'autres';
export type PropertyStanding = 'economique' | 'moyen' | 'haut';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type JsonB = string | number | boolean | null | { [key: string]: any } | JsonB[];

// Interface pour les utilisateurs (lié à auth.users)
export interface User {
  id: string; // UUID, FK vers auth.users(id)
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string | null;
  is_active: boolean;
  permissions: JsonB;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// Interface pour les administrateurs de la plateforme
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

// Interface pour les agences
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

// Interface pour la liaison utilisateurs/agences
export interface AgencyUser {
  id: string; // UUID
  user_id: string; // UUID, FK vers users(id)
  agency_id: string; // UUID, FK vers agencies(id)
  role: AgencyUserRole;
  created_at: string; // timestamptz
}

// Interface pour les demandes d'inscription d'agence
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
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  processed_by?: string | null; // UUID, FK vers users(id)
  processed_at?: string | null; // timestamptz
  created_at: string; // timestamptz
  director_password?: string | null; // À utiliser avec précaution
  director_auth_user_id?: string | null; // UUID, FK vers users(id)
}

// Interface pour les abonnements d'agence
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
  //payment_history: JsonB; // Tableau JSONB
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// Interface pour les paiements d'abonnement
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

// Interface pour les classements d'agence


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
  rewards: Reward[] | null; // Tableau JSONB
  created_at: string; // timestamptz
}

// Interface pour les propriétaires
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

// Interface pour les locataires
export interface Tenant {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
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

// Interface pour les biens immobiliers
export interface Property {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
  owner_id: string; // UUID, FK vers owners(id)
  title: string;
  description?: string | null;
  location: JsonB;
  details: JsonB;
  standing: PropertyStanding;
  rooms: JsonB; // Tableau JSONB
  images: JsonB; // Tableau JSONB
  is_available: boolean;
  for_sale: boolean;
  for_rent: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// Interface pour les annonces
export interface Announcement {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
  property_id: string; // UUID, FK vers properties(id)
  title: string;
  description: string;
  type: AnnouncementType;
  is_active: boolean;
  expires_at?: string | null; // timestamptz
  views: number;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// Interface pour les intérêts sur les annonces
export interface AnnouncementInterest {
  id: string; // UUID
  announcement_id: string; // UUID, FK vers announcements(id)
  agency_id: string; // UUID, FK vers agencies(id)
  user_id: string; // UUID, FK vers users(id)
  message?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string; // timestamptz
}

// Interface pour les contrats
export interface Contract {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
  property_id: string; // UUID, FK vers properties(id)
  owner_id: string; // UUID, FK vers owners(id)
  tenant_id: string; // UUID, FK vers tenants(id)
  type: ContractType;
  start_date: string; // date
  end_date?: string | null; // date
  monthly_rent?: number | null;
  sale_price?: number | null;
  deposit?: number | null;
  charges?: number | null;
  commission_rate: number;
  commission_amount: number;
  status: ContractStatus;
  terms: string;
  documents: JsonB; // Tableau JSONB
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// Interface pour les reçus de loyer
export interface RentReceipt {
  id: string; // UUID
  receipt_number: string;
  contract_id: string; // UUID, FK vers contracts(id)
  period_month: number;
  period_year: number;
  rent_amount: number;
  charges: number;
  total_amount: number;
  commission_amount: number;
  owner_payment: number;
  payment_date: string; // date
  payment_method: PayMethod;
  notes?: string | null;
  issued_by: string; // UUID, FK vers users(id)
  created_at: string; // timestamptz
}

// Interface pour les états financiers
export interface FinancialStatement {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
  owner_id?: string | null; // UUID, FK vers owners(id)
  tenant_id?: string | null; // UUID, FK vers tenants(id)
  period_start: string; // date
  period_end: string; // date
  total_income: number;
  total_expenses: number;
  net_balance: number;
  pending_payments: number;
  transactions: JsonB; // Tableau JSONB
  generated_by: string; // UUID, FK vers users(id)
  generated_at: string; // timestamptz
  created_at: string; // timestamptz
}

// Interface pour les messages
export interface Message {
  id: string; // UUID
  sender_id: string; // UUID, FK vers users(id)
  receiver_id: string; // UUID, FK vers users(id)
  agency_id?: string | null; // UUID, FK vers agencies(id)
  property_id?: string | null; // UUID, FK vers properties(id)
  announcement_id?: string | null; // UUID, FK vers announcements(id)
  subject: string;
  content: string;
  is_read: boolean;
  attachments: JsonB; // Tableau JSONB
  created_at: string; // timestamptz
}

// Interface pour les notifications
export interface Notification {
  id: string; // UUID
  user_id: string; // UUID, FK vers users(id)
  type: NotifType;
  title: string;
  message: string;
  data: JsonB;
  is_read: boolean;
  priority: NotifPriority;
  created_at: string; // timestamptz
}

// Interface pour les paramètres de la plateforme
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

// Interface pour les logs d'audit
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

// Interface pour les alertes système (utilisée dans getSystemAlerts)
export interface SystemAlert {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
}