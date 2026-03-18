-- Refinements for Multi-Site and Geographic Management
-- Specifically designed for Residences Meublées (Furniture Residences) in Côte d'Ivoire

-- 1. Sites Table (Group multiple units in one geographic building/location)
CREATE TABLE IF NOT EXISTS residence_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: Résidence Les Perles, Immeuble Horizon
    zone TEXT NOT NULL, -- Ex: Cocody, Plateau, Marcory, Assinie
    address TEXT,
    city TEXT DEFAULT 'Abidjan',
    amenities TEXT[], -- ['Piscine', 'Sécurité 24/7', 'Wifi', 'Générateur']
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agency_id, name)
);

-- 2. Refine residence_units to link with sites
ALTER TABLE residence_units ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES residence_sites(id) ON DELETE SET NULL;
ALTER TABLE residence_units ADD COLUMN IF NOT EXISTS unit_category TEXT DEFAULT 'standard' CHECK (unit_category IN ('studio', '2-pieces', '3-pieces', 'penthouse', 'villa'));
ALTER TABLE residence_units ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Dynamic Pricing by Type/Zone (Advanced Policy)
CREATE TABLE IF NOT EXISTS modular_pricing_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES residence_sites(id) ON DELETE CASCADE,
    unit_category TEXT NOT NULL,
    nightly_rate DECIMAL(12,2) NOT NULL,
    weekend_rate DECIMAL(12,2), -- Potential higher rate for weekends in Abidjan/Assinie
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agency_id, site_id, unit_category)
);

-- RLS Policies for the new tables
ALTER TABLE residence_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE modular_pricing_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their sites" ON residence_sites FOR SELECT USING (agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid()));
CREATE POLICY "Directors can manage sites" ON residence_sites FOR ALL USING (agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid() AND role = 'director'));

CREATE POLICY "Users can see pricing overrides" ON modular_pricing_overrides FOR SELECT USING (agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid()));
CREATE POLICY "Directors can manage pricing overrides" ON modular_pricing_overrides FOR ALL USING (agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid() AND role = 'director'));

-- Note: Ensure uuid_generate_v4 extension is enabled (already likely true from previous scripts)
