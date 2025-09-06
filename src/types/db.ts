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
// Contrainte de type pour limiter T aux entités du schéma
export type Entity =
  | User | Agency | Owner | Tenant | Property | Contract | Announcement | RentReceipt
  | FinancialStatement | Message | Notification | EmailNotification | AgencySubscription
  | SubscriptionPayment | AgencyRanking | PlatformSetting | AuditLog | AnnouncementInterest;

export type RentReceiptWithContract = {
  total_amount: number | null;
  contract: {
    agency_id: string;
  } | null;
};
// Interface pour les utilisateurs (lié à auth.users)
export interface User {
  id: string; // UUID, FK vers auth.users(id)
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string | null;
  is_active: boolean;
  permissions: UserPermissions;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  // Note: agency_id and role are fetched via agency_users in AuthContext
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

export interface UserFormData {
  id?: string; // Optional for new users
  email: string;
  first_name: string;
  last_name: string;
  role: AgencyUserRole;
  agency_id: string | null;
  permissions: UserPermissions;
  is_active: boolean;
  password?: string; // Optional for updates
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
  updated_at: string;
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

export type TenantFormData = Omit<Tenant, 'id' | 'created_at' | 'updated_at'>;

export interface TenantFilters {
  agency_id?: string;
  limit?: number;
  offset?: number;
  search?: string;
  marital_status?: MaritalStatus;
  payment_status?: PaymentReliability;
}

export interface TenantWithRental extends Tenant {
  contractId?: string;
  propertyId?: string;
  ownerId?: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  agencyId: string;
  startDate: Date;
  endDate?: Date;
  monthlyRent: number;
  deposit: number;
  status: 'actif' | 'termine' | 'resilie';
  renewalHistory: RenewalRecord[];
  paymentHistory: PaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RenewalRecord {
  id: string;
  rentalId: string;
  previousEndDate: Date;
  newEndDate: Date;
  newRent?: number;
  renewalDate: Date;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  rentalId: string;
  month: string;
  year: number;
  amount: number;
  paidDate?: Date;
  dueDate: Date;
  status: 'paye' | 'retard' | 'impaye';
  paymentMethod?: 'especes' | 'cheque' | 'virement' | 'mobile_money';
  notes?: string;
  createdAt: Date;
}

export interface PropertyLocation {
  commune: string;
  quartier: string;
  numeroLot?: string;
  numeroIlot?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  facilites: string[];
}

export interface PropertyDetails {
  type: 'villa' | 'appartement' | 'terrain_nu' | 'immeuble' | 'autres';
  numeroNom?: string; // Pour villa
  numeroPorte?: string; // Pour appartement
  titreProprietaire?: string; // Pour terrain nu
  numeroEtage?: string; // Pour immeuble
  numeroPorteImmeuble?: string; // Pour immeuble
  autresDetails?: string; // Pour autres
}

export interface RoomDetails {
  type: 'sejour' | 'cuisine' | 'chambre_principale' | 'chambre_2' | 'chambre_3' | 'salle_bain' | 'wc' | 'autre';
  nom?: string;
  superficie?: number;
  plafond: {
    type: 'staff' | 'plafond_bois' | 'lambris_pvc' | 'lambris_bois' | 'dalle_simple' | 'autre';
    details?: string;
  };
  electricite: {
    nombrePrises: number;
    nombreInterrupteurs: number;
    nombreDismatique: number;
    nombreAmpoules: number;
    typeLuminaires: string;
  };
  peinture: {
    couleur: string;
    type: string;
    marque: string;
  };
  menuiserie: {
    materiau: 'bois' | 'alu';
    nombreFenetres: number;
    typeFenetres: string;
  };
  serrure: {
    typePoignee: string;
    marquePoignee: string;
    typeCle: string;
  };
  sol: {
    type: 'carrelage' | 'parquet' | 'autre';
    details?: string;
  };
  images: PropertyImage[];
}

export interface PropertyImage {
  id: string;
  url: string;
  file?: File;
  room: string;
  description?: string;
  isPrimary: boolean;
}

// Interface pour les biens immobiliers
export interface Property {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
  owner_id: string; // UUID, FK vers owners(id)
  title: string;
  description?: string | null;
  location: PropertyLocation;
  details: PropertyDetails;
  standing: PropertyStanding;
  rooms: RoomDetails[];
  images: PropertyImage[];
  is_available: boolean;
  for_sale: boolean;
  for_rent: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface PropertyFormData extends Omit<Property, 'id' | 'created_at' | 'updated_at'> { }

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
  id: string;
  receipt_number: string;       // Numéro unique (ex: REC-20250901-001)
  period_month: string;         // Mois concerné (ex: "septembre")
  period_year: number;          // Année concernée
  rent_amount: number;          // Montant du loyer hors charges
  charges?: number;             // Charges mensuelles
  total_amount: number;         // Somme loyer + charges
  payment_date: string;         // Date de paiement effectif
  payment_method: PayMethod;    // Mode de paiement
  notes?: string | null;        // Notes éventuelles (optionnel)
  issued_by: string;            // Qui a émis la quittance (ex: nom agence ou agent, UUID, FK vers users(id))
  created_at: string;           // Date de création en base, timestamptz
  commission_amount: number;    // Commission agence retenue


  // Relations pour générer une quittance
  contract_id: string;          // Lien avec le contrat
  tenant_id: string;
  property_id: string;
  owner_id: string;
  agency_id?: string;           // Agence émettrice (optionnel si multi-agence)
  owner_payment?: number;       // Montant reversé au propriétaire
}

// Interface pour les états financiers
export interface FinancialTransaction {
  id: string; // UUID
  agency_id: string; // UUID, FK vers agencies(id)
  owner_id: string; // UUID, FK vers owners(id) or tenants(id)
  entity_type: 'owner' | 'tenant';
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string; // date
  property_id?: string | null; // UUID, FK vers properties(id)
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface FinancialStatement {
  id: string; // UUID
  agency_id: string | null; // UUID, FK vers agencies(id)
  owner_id: string | null; // UUID, FK vers owners(id) or tenants(id)
  tenant_id: string | null;
  entity_type: 'owner' | 'tenant';
  period: { start_date: string; end_date: string };
  summary: {
    total_income: number;
    total_expenses: number;
    balance: number;
    pending_payments: number;
  };
  transactions: FinancialTransaction[];
  generated_at: string; // timestamptz
  generated_by: string | null; // UUID, FK vers users(id)
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
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
  agency_id: string;
}

export interface EmailNotification {
  id: string;
  type: 'new_user' | 'new_contract' | 'receipt_generated' | 'payment_reminder' | 'contract_expiry';
  recipient: string;
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  agency_id: string;
  created_at: string;
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