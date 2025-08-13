/*
  # Schema initial pour la plateforme immobilière collaborative

  1. Nouvelles Tables
    - `agencies` - Informations des agences immobilières
    - `users` - Utilisateurs avec permissions par rôle
    - `owners` - Propriétaires de biens immobiliers
    - `properties` - Biens immobiliers avec détails techniques
    - `tenants` - Locataires avec historique de paiement
    - `rentals` - Contrats de location
    - `payment_records` - Historique des paiements
    - `contracts` - Contrats (location/vente/gestion)
    - `announcements` - Annonces inter-agences
    - `messages` - Messagerie collaborative
    - `notifications` - Système de notifications

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques basées sur l'agence et les rôles utilisateur
    - Accès inter-agences contrôlé pour la collaboration

  3. Fonctionnalités
    - Recherche d'historique des locataires/propriétaires
    - Système de notation des payeurs
    - Collaboration sécurisée entre agences
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  commercial_register text UNIQUE NOT NULL,
  logo text,
  is_accredited boolean DEFAULT false,
  accreditation_number text,
  address text NOT NULL,
  city text NOT NULL,
  phone text NOT NULL,
  email text UNIQUE NOT NULL,
  director_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('director', 'manager', 'agent')),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  avatar text,
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Owners table
CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  city text NOT NULL,
  property_title text NOT NULL CHECK (property_title IN ('attestation_villageoise', 'lettre_attribution', 'permis_habiter', 'acd', 'tf', 'cpf', 'autres')),
  property_title_details text,
  marital_status text NOT NULL CHECK (marital_status IN ('celibataire', 'marie', 'divorce', 'veuf')),
  spouse_name text,
  spouse_phone text,
  children_count integer DEFAULT 0,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid REFERENCES owners(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location jsonb NOT NULL,
  details jsonb NOT NULL,
  standing text NOT NULL CHECK (standing IN ('economique', 'moyen', 'haut')),
  rooms jsonb DEFAULT '[]',
  images jsonb DEFAULT '[]',
  is_available boolean DEFAULT true,
  for_sale boolean DEFAULT false,
  for_rent boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  city text NOT NULL,
  marital_status text NOT NULL CHECK (marital_status IN ('celibataire', 'marie', 'divorce', 'veuf')),
  spouse_name text,
  spouse_phone text,
  children_count integer DEFAULT 0,
  profession text NOT NULL,
  nationality text NOT NULL,
  photo_url text,
  id_card_url text,
  payment_status text NOT NULL CHECK (payment_status IN ('bon', 'irregulier', 'mauvais')),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rentals table
CREATE TABLE IF NOT EXISTS rentals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES owners(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  monthly_rent numeric(12,2) NOT NULL,
  deposit numeric(12,2),
  status text NOT NULL CHECK (status IN ('actif', 'termine', 'resilie')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment records table
CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id uuid REFERENCES rentals(id) ON DELETE CASCADE,
  month text NOT NULL,
  year integer NOT NULL,
  amount numeric(12,2) NOT NULL,
  paid_date date,
  due_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('paye', 'retard', 'impaye')),
  payment_method text CHECK (payment_method IN ('especes', 'cheque', 'virement', 'mobile_money')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES owners(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('location', 'vente', 'gestion')),
  start_date date NOT NULL,
  end_date date,
  monthly_rent numeric(12,2),
  sale_price numeric(12,2),
  deposit numeric(12,2),
  charges numeric(12,2),
  commission_rate numeric(5,2) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
  terms text NOT NULL,
  documents jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('location', 'vente')),
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  announcement_id uuid REFERENCES announcements(id) ON DELETE SET NULL,
  subject text NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('rental_alert', 'payment_reminder', 'new_message', 'property_update', 'contract_expiry', 'new_interest')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agencies
CREATE POLICY "Users can view their own agency" ON agencies
  FOR SELECT TO authenticated
  USING (id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Directors can update their agency" ON agencies
  FOR UPDATE TO authenticated
  USING (id = (SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'director'));

-- RLS Policies for users
CREATE POLICY "Users can view users from their agency" ON users
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Directors can manage users in their agency" ON users
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'director'));

-- RLS Policies for owners
CREATE POLICY "Users can view owners from their agency" ON owners
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage owners in their agency" ON owners
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- RLS Policies for properties
CREATE POLICY "Users can view properties from their agency" ON properties
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage properties in their agency" ON properties
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- RLS Policies for tenants (with inter-agency collaboration)
CREATE POLICY "Users can view tenants from their agency" ON tenants
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "All agencies can search tenant history for collaboration" ON tenants
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage tenants in their agency" ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update tenants in their agency" ON tenants
  FOR UPDATE TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- RLS Policies for rentals
CREATE POLICY "Users can view rentals from their agency" ON rentals
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage rentals in their agency" ON rentals
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- RLS Policies for announcements (inter-agency collaboration)
CREATE POLICY "All agencies can view active announcements" ON announcements
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can manage announcements from their agency" ON announcements
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- RLS Policies for messages
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_owners_agency_id ON owners(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agency_id ON tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_payment_status ON tenants(payment_status);
CREATE INDEX IF NOT EXISTS idx_rentals_agency_id ON rentals(agency_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);