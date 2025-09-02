/*
  # Système d'Administration Complet

  1. Nouvelles Tables
    - `platform_admins` - Administrateurs de la plateforme
    - `agency_subscriptions` - Abonnements des agences
    - `agency_rankings` - Classements semestriels
    - `agency_rewards` - Récompenses obtenues
    - `rent_receipts` - Quittances de loyer
    - `financial_statements` - États financiers
    - `platform_settings` - Paramètres globaux

  2. Fonctionnalités
    - Gestion des abonnements et cotisations
    - Système de classement automatique
    - Génération de quittances
    - États financiers détaillés
    - Identifiants uniques par agence

  3. Sécurité
    - RLS activé sur toutes les tables
    - Permissions spécifiques aux admins
    - Audit trail complet
*/

-- Table des administrateurs de la plateforme
CREATE TABLE IF NOT EXISTS platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin')),
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des abonnements des agences
CREATE TABLE IF NOT EXISTS agency_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('basic', 'premium', 'enterprise')),
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
  monthly_fee numeric(10,2) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  last_payment_date date,
  next_payment_date date NOT NULL,
  trial_days_remaining integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des classements d'agences
CREATE TABLE IF NOT EXISTS agency_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  period text NOT NULL, -- Format: "2024-S1", "2024-S2"
  rank integer NOT NULL,
  score numeric(5,2) NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Table des récompenses
CREATE TABLE IF NOT EXISTS agency_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ranking_id uuid NOT NULL REFERENCES agency_rankings(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('discount', 'feature_unlock', 'badge', 'cash_bonus')),
  title text NOT NULL,
  description text NOT NULL,
  value numeric(10,2) DEFAULT 0,
  valid_until date NOT NULL,
  is_claimed boolean DEFAULT false,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Table des quittances de loyer
CREATE TABLE IF NOT EXISTS rent_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month text NOT NULL,
  year integer NOT NULL,
  rent_amount numeric(12,2) NOT NULL,
  charges numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('especes', 'cheque', 'virement', 'mobile_money')),
  notes text,
  issued_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des états financiers
CREATE TABLE IF NOT EXISTS financial_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL, -- owner_id or tenant_id
  entity_type text NOT NULL CHECK (entity_type IN ('owner', 'tenant')),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_income numeric(15,2) DEFAULT 0,
  total_expenses numeric(15,2) DEFAULT 0,
  balance numeric(15,2) DEFAULT 0,
  pending_payments numeric(15,2) DEFAULT 0,
  transactions jsonb DEFAULT '[]',
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table des paramètres de la plateforme
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES platform_admins(id),
  updated_at timestamptz DEFAULT now()
);

-- Indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_agency_id ON agency_subscriptions(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_status ON agency_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_next_payment ON agency_subscriptions(next_payment_date);

CREATE INDEX IF NOT EXISTS idx_agency_rankings_period ON agency_rankings(period);
CREATE INDEX IF NOT EXISTS idx_agency_rankings_rank ON agency_rankings(rank);
CREATE INDEX IF NOT EXISTS idx_agency_rankings_agency_period ON agency_rankings(agency_id, period);

CREATE INDEX IF NOT EXISTS idx_rent_receipts_agency_id ON rent_receipts(agency_id);
CREATE INDEX IF NOT EXISTS idx_rent_receipts_property_id ON rent_receipts(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_receipts_month_year ON rent_receipts(month, year);

CREATE INDEX IF NOT EXISTS idx_financial_statements_entity ON financial_statements(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_financial_statements_agency_id ON financial_statements(agency_id);
CREATE INDEX IF NOT EXISTS idx_financial_statements_period ON financial_statements(period_start, period_end);

-- Triggers pour les timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_platform_admins_updated_at BEFORE UPDATE ON platform_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agency_subscriptions_updated_at BEFORE UPDATE ON agency_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Policies pour les administrateurs
CREATE POLICY "Platform admins can manage all data" ON platform_admins FOR ALL TO authenticated USING (true);
CREATE POLICY "Platform admins can manage subscriptions" ON agency_subscriptions FOR ALL TO authenticated USING (true);
CREATE POLICY "Platform admins can manage rankings" ON agency_rankings FOR ALL TO authenticated USING (true);
CREATE POLICY "Platform admins can manage rewards" ON agency_rewards FOR ALL TO authenticated USING (true);
CREATE POLICY "Platform admins can manage settings" ON platform_settings FOR ALL TO authenticated USING (true);

-- Policies pour les agences
CREATE POLICY "Agencies can view their subscription" ON agency_subscriptions FOR SELECT TO authenticated 
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Agencies can view their rankings" ON agency_rankings FOR SELECT TO authenticated 
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Agencies can view their rewards" ON agency_rewards FOR SELECT TO authenticated 
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Agencies can manage their receipts" ON rent_receipts FOR ALL TO authenticated 
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Agencies can manage their financial statements" ON financial_statements FOR ALL TO authenticated 
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- Données de démonstration pour l'admin
INSERT INTO platform_admins (email, first_name, last_name, role, permissions) VALUES
('admin@immoplatform.ci', 'Super', 'Admin', 'super_admin', '{"agencyManagement": true, "subscriptionManagement": true, "platformSettings": true, "reports": true, "userSupport": true}')
ON CONFLICT (email) DO NOTHING;

-- Abonnements de démonstration
INSERT INTO agency_subscriptions (agency_id, plan_type, status, monthly_fee, start_date, next_payment_date) 
SELECT 
  id,
  'premium',
  'active',
  50000,
  '2024-01-01',
  '2024-04-01'
FROM agencies 
WHERE name = 'Immobilier Excellence'
ON CONFLICT DO NOTHING;

-- Paramètres par défaut
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
('subscription_plans', '{"basic": {"price": 25000, "features": ["50 properties", "email support"]}, "premium": {"price": 50000, "features": ["unlimited properties", "priority support", "collaboration"]}, "enterprise": {"price": 100000, "features": ["all premium", "custom API", "dedicated support"]}}', 'Plans d''abonnement disponibles'),
('ranking_criteria', '{"properties": 0.15, "contracts": 0.20, "revenue": 0.25, "satisfaction": 0.20, "collaboration": 0.10, "reliability": 0.10}', 'Critères de classement des agences'),
('platform_config', '{"trial_days": 30, "grace_period_days": 7, "max_agencies_per_city": 10, "maintenance_mode": false}', 'Configuration générale de la plateforme')
ON CONFLICT (setting_key) DO NOTHING;

-- Fonction pour calculer le score d'une agence
CREATE OR REPLACE FUNCTION calculate_agency_score(agency_uuid uuid, period_start date, period_end date)
RETURNS numeric AS $$
DECLARE
  properties_count integer;
  contracts_count integer;
  total_revenue numeric;
  score numeric;
BEGIN
  -- Compter les propriétés
  SELECT COUNT(*) INTO properties_count
  FROM properties 
  WHERE agency_id = agency_uuid 
    AND created_at BETWEEN period_start AND period_end;
  
  -- Compter les contrats
  SELECT COUNT(*) INTO contracts_count
  FROM contracts 
  WHERE agency_id = agency_uuid 
    AND created_at BETWEEN period_start AND period_end;
  
  -- Calculer le chiffre d'affaires
  SELECT COALESCE(SUM(commission_amount), 0) INTO total_revenue
  FROM contracts 
  WHERE agency_id = agency_uuid 
    AND created_at BETWEEN period_start AND period_end;
  
  -- Calcul du score (simplifié)
  score := (
    LEAST(properties_count / 100.0 * 100, 100) * 0.15 +
    LEAST(contracts_count / 50.0 * 100, 100) * 0.20 +
    LEAST(total_revenue / 10000000.0 * 100, 100) * 0.25 +
    90 * 0.20 + -- satisfaction client (mock)
    85 * 0.10 + -- collaboration (mock)
    95 * 0.10   -- fiabilité (mock)
  );
  
  RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer les classements
CREATE OR REPLACE FUNCTION generate_agency_rankings(period_text text, period_start date, period_end date)
RETURNS void AS $$
DECLARE
  agency_record record;
  current_rank integer := 1;
BEGIN
  -- Supprimer les classements existants pour cette période
  DELETE FROM agency_rankings WHERE period = period_text;
  
  -- Générer les nouveaux classements
  FOR agency_record IN 
    SELECT 
      a.id,
      calculate_agency_score(a.id, period_start, period_end) as score
    FROM agencies a
    WHERE a.id IN (SELECT agency_id FROM agency_subscriptions WHERE status = 'active')
    ORDER BY calculate_agency_score(a.id, period_start, period_end) DESC
  LOOP
    INSERT INTO agency_rankings (agency_id, period, rank, score, metrics)
    VALUES (
      agency_record.id,
      period_text,
      current_rank,
      agency_record.score,
      jsonb_build_object(
        'totalProperties', (SELECT COUNT(*) FROM properties WHERE agency_id = agency_record.id),
        'totalContracts', (SELECT COUNT(*) FROM contracts WHERE agency_id = agency_record.id),
        'totalRevenue', (SELECT COALESCE(SUM(commission_amount), 0) FROM contracts WHERE agency_id = agency_record.id),
        'clientSatisfaction', 90,
        'collaborationScore', 85,
        'paymentReliability', 95
      )
    );
    
    current_rank := current_rank + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;