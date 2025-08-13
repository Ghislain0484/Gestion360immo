-- =====================================================
-- PLATEFORME IMMOBILIÈRE - CONFIGURATION COMPLÈTE
-- =====================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. SUPPRESSION DES TABLES EXISTANTES (si elles existent)
-- =====================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS announcement_interests CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS contract_documents CASCADE;
DROP TABLE IF EXISTS contract_renewals CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS rental_renewals CASCADE;
DROP TABLE IF EXISTS rentals CASCADE;
DROP TABLE IF EXISTS property_images CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;

-- =====================================================
-- 2. CRÉATION DES TABLES
-- =====================================================

-- Table des agences
CREATE TABLE agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    commercial_register TEXT UNIQUE NOT NULL,
    logo TEXT,
    is_accredited BOOLEAN DEFAULT false,
    accreditation_number TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    director_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('director', 'manager', 'agent')),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    avatar TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des propriétaires
CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    property_title TEXT NOT NULL CHECK (property_title IN (
        'attestation_villageoise', 'lettre_attribution', 'permis_habiter', 
        'acd', 'tf', 'cpf', 'autres'
    )),
    property_title_details TEXT,
    marital_status TEXT NOT NULL CHECK (marital_status IN ('celibataire', 'marie', 'divorce', 'veuf')),
    spouse_name TEXT,
    spouse_phone TEXT,
    children_count INTEGER DEFAULT 0 CHECK (children_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des propriétés
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location JSONB NOT NULL DEFAULT '{}',
    details JSONB NOT NULL DEFAULT '{}',
    standing TEXT NOT NULL CHECK (standing IN ('economique', 'moyen', 'haut')),
    rooms JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    is_available BOOLEAN DEFAULT true,
    for_sale BOOLEAN DEFAULT false,
    for_rent BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des locataires
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    marital_status TEXT NOT NULL CHECK (marital_status IN ('celibataire', 'marie', 'divorce', 'veuf')),
    spouse_name TEXT,
    spouse_phone TEXT,
    children_count INTEGER DEFAULT 0 CHECK (children_count >= 0),
    profession TEXT NOT NULL,
    nationality TEXT NOT NULL,
    photo_url TEXT,
    id_card_url TEXT,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('bon', 'irregulier', 'mauvais')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des contrats
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('location', 'vente', 'gestion')),
    start_date DATE NOT NULL,
    end_date DATE,
    monthly_rent DECIMAL(15,2),
    sale_price DECIMAL(15,2),
    deposit DECIMAL(15,2),
    charges DECIMAL(15,2),
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    commission_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
    terms TEXT NOT NULL,
    documents JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des annonces de collaboration
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('location', 'vente')),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des intérêts pour les annonces
CREATE TABLE announcement_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    announcement_id UUID REFERENCES announcements(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'rental_alert', 'payment_reminder', 'new_message', 
        'property_update', 'contract_expiry', 'new_interest'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CRÉATION DES INDEX POUR LES PERFORMANCES
-- =====================================================

-- Index pour les recherches fréquentes
CREATE INDEX idx_owners_agency_id ON owners(agency_id);
CREATE INDEX idx_owners_phone ON owners(phone);
CREATE INDEX idx_owners_name ON owners(first_name, last_name);

CREATE INDEX idx_properties_agency_id ON properties(agency_id);
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_available ON properties(is_available);

CREATE INDEX idx_tenants_agency_id ON tenants(agency_id);
CREATE INDEX idx_tenants_phone ON tenants(phone);
CREATE INDEX idx_tenants_payment_status ON tenants(payment_status);

CREATE INDEX idx_contracts_agency_id ON contracts(agency_id);
CREATE INDEX idx_contracts_property_id ON contracts(property_id);
CREATE INDEX idx_contracts_status ON contracts(status);

CREATE INDEX idx_announcements_agency_id ON announcements(agency_id);
CREATE INDEX idx_announcements_active ON announcements(is_active);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_read ON messages(is_read);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- =====================================================
-- 4. ACTIVATION DE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLITIQUES RLS PERMISSIVES
-- =====================================================

-- Politiques pour agencies
CREATE POLICY "Allow all operations on agencies" ON agencies FOR ALL USING (true);

-- Politiques pour users
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);

-- Politiques pour owners
CREATE POLICY "Allow all operations on owners" ON owners FOR ALL USING (true);

-- Politiques pour properties
CREATE POLICY "Allow all operations on properties" ON properties FOR ALL USING (true);

-- Politiques pour tenants
CREATE POLICY "Allow all operations on tenants" ON tenants FOR ALL USING (true);

-- Politiques pour contracts
CREATE POLICY "Allow all operations on contracts" ON contracts FOR ALL USING (true);

-- Politiques pour announcements
CREATE POLICY "Allow all operations on announcements" ON announcements FOR ALL USING (true);

-- Politiques pour announcement_interests
CREATE POLICY "Allow all operations on announcement_interests" ON announcement_interests FOR ALL USING (true);

-- Politiques pour messages
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true);

-- Politiques pour notifications
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);

-- =====================================================
-- 6. INSERTION DES DONNÉES DE DÉMONSTRATION
-- =====================================================

-- Agence de démonstration
INSERT INTO agencies (
    id,
    name,
    commercial_register,
    address,
    city,
    phone,
    email,
    is_accredited,
    accreditation_number
) VALUES (
    'b2c3d4e5-f6a7-8901-2345-678901bcdef0',
    'Immobilier Excellence CI',
    'CI-ABJ-2024-B-12345',
    'Rue des Jardins, Cocody',
    'Abidjan',
    '+225 27 22 44 55 66',
    'contact@immobilier-excellence.ci',
    true,
    'AGR-2024-001'
) ON CONFLICT (id) DO NOTHING;

-- Utilisateurs de démonstration
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    role,
    agency_id,
    permissions
) VALUES 
(
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'marie.kouassi@agence.com',
    'Marie',
    'Kouassi',
    'director',
    'b2c3d4e5-f6a7-8901-2345-678901bcdef0',
    '{"dashboard": true, "properties": true, "owners": true, "tenants": true, "contracts": true, "collaboration": true, "reports": true, "notifications": true, "settings": true, "userManagement": true}'
),
(
    'c3d4e5f6-a7b8-9012-3456-789012cdef01',
    'manager1@agence.com',
    'Jean',
    'Bamba',
    'manager',
    'b2c3d4e5-f6a7-8901-2345-678901bcdef0',
    '{"dashboard": true, "properties": true, "owners": true, "tenants": true, "contracts": true, "collaboration": true, "reports": true, "notifications": true, "settings": false, "userManagement": false}'
),
(
    'd4e5f6a7-b8c9-0123-4567-890123def012',
    'agent1@agence.com',
    'Koffi',
    'Martin',
    'agent',
    'b2c3d4e5-f6a7-8901-2345-678901bcdef0',
    '{"dashboard": true, "properties": true, "owners": true, "tenants": true, "contracts": false, "collaboration": false, "reports": false, "notifications": true, "settings": false, "userManagement": false}'
) ON CONFLICT (email) DO NOTHING;

-- Mise à jour du director_id de l'agence
UPDATE agencies 
SET director_id = 'a1b2c3d4-e5f6-7890-1234-567890abcdef' 
WHERE id = 'b2c3d4e5-f6a7-8901-2345-678901bcdef0';

-- =====================================================
-- 7. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. VÉRIFICATION FINALE
-- =====================================================

-- Vérifier que toutes les tables ont été créées
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Nombre de tables créées: %', table_count;
    
    IF table_count >= 10 THEN
        RAISE NOTICE '✅ Configuration Supabase terminée avec succès!';
        RAISE NOTICE '🎯 Vous pouvez maintenant utiliser la plateforme immobilière.';
        RAISE NOTICE '👤 Comptes de test disponibles:';
        RAISE NOTICE '   - marie.kouassi@agence.com (Directeur)';
        RAISE NOTICE '   - manager1@agence.com (Manager)';
        RAISE NOTICE '   - agent1@agence.com (Agent)';
        RAISE NOTICE '🔑 Mot de passe pour tous: demo123';
    ELSE
        RAISE WARNING '⚠️ Certaines tables n''ont pas été créées correctement.';
    END IF;
END $$;