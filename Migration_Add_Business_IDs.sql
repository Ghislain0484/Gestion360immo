-- Migration: Add Business ID System
-- Creates id_counters table and adds business_id columns to all entities

-- Create ID counters table
CREATE TABLE IF NOT EXISTS id_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(4) NOT NULL,
  date_key VARCHAR(6) NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(type, date_key)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_id_counters_type_date ON id_counters(type, date_key);

-- Add business_id columns to existing tables
ALTER TABLE owners ADD COLUMN IF NOT EXISTS business_id VARCHAR(20) UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_id VARCHAR(20) UNIQUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS business_id VARCHAR(20) UNIQUE;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS business_id VARCHAR(20) UNIQUE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS business_id VARCHAR(20) UNIQUE;
ALTER TABLE rent_receipts ADD COLUMN IF NOT EXISTS business_id VARCHAR(20) UNIQUE;

-- Add indexes on business_id columns
CREATE INDEX IF NOT EXISTS idx_owners_business_id ON owners(business_id);
CREATE INDEX IF NOT EXISTS idx_tenants_business_id ON tenants(business_id);
CREATE INDEX IF NOT EXISTS idx_properties_business_id ON properties(business_id);
CREATE INDEX IF NOT EXISTS idx_agencies_business_id ON agencies(business_id);
CREATE INDEX IF NOT EXISTS idx_contracts_business_id ON contracts(business_id);
CREATE INDEX IF NOT EXISTS idx_rent_receipts_business_id ON rent_receipts(business_id);

-- Function to get next counter (atomic)
CREATE OR REPLACE FUNCTION get_next_counter(p_type VARCHAR(4), p_date_key VARCHAR(6))
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_counter INTEGER;
BEGIN
  -- Try to insert new counter
  INSERT INTO id_counters (type, date_key, counter)
  VALUES (p_type, p_date_key, 1)
  ON CONFLICT (type, date_key) DO UPDATE
  SET counter = id_counters.counter + 1,
      updated_at = NOW()
  RETURNING counter INTO v_counter;
  
  RETURN v_counter;
END;
$$;

-- Function to generate business ID
CREATE OR REPLACE FUNCTION generate_business_id(p_type VARCHAR(4))
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_key VARCHAR(6);
  v_counter INTEGER;
  v_business_id VARCHAR(20);
BEGIN
  -- Generate date key (AAMMJJ)
  v_date_key := TO_CHAR(NOW(), 'YYMMDD');
  
  -- Get next counter
  v_counter := get_next_counter(p_type, v_date_key);
  
  -- Format business ID: TYPE-AAMMJJ-NNNNN
  v_business_id := p_type || '-' || v_date_key || '-' || LPAD(v_counter::TEXT, 5, '0');
  
  RETURN v_business_id;
END;
$$;

-- Trigger function to auto-generate business_id on insert
CREATE OR REPLACE FUNCTION auto_generate_business_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_type VARCHAR(4);
BEGIN
  -- Determine type based on table name
  CASE TG_TABLE_NAME
    WHEN 'owners' THEN v_type := 'PROP';
    WHEN 'tenants' THEN v_type := 'LOC';
    WHEN 'properties' THEN v_type := 'BIEN';
    WHEN 'agencies' THEN v_type := 'AGEN';
    WHEN 'contracts' THEN v_type := 'CONT';
    WHEN 'rent_receipts' THEN v_type := 'PAIE';
    ELSE RAISE EXCEPTION 'Unknown table for business_id generation: %', TG_TABLE_NAME;
  END CASE;
  
  -- Generate business_id if not provided
  IF NEW.business_id IS NULL THEN
    NEW.business_id := generate_business_id(v_type);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for auto-generation
DROP TRIGGER IF EXISTS trigger_owners_business_id ON owners;
CREATE TRIGGER trigger_owners_business_id
  BEFORE INSERT ON owners
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_business_id();

DROP TRIGGER IF EXISTS trigger_tenants_business_id ON tenants;
CREATE TRIGGER trigger_tenants_business_id
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_business_id();

DROP TRIGGER IF EXISTS trigger_properties_business_id ON properties;
CREATE TRIGGER trigger_properties_business_id
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_business_id();

DROP TRIGGER IF EXISTS trigger_agencies_business_id ON agencies;
CREATE TRIGGER trigger_agencies_business_id
  BEFORE INSERT ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_business_id();

DROP TRIGGER IF EXISTS trigger_contracts_business_id ON contracts;
CREATE TRIGGER trigger_contracts_business_id
  BEFORE INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_business_id();

DROP TRIGGER IF EXISTS trigger_rent_receipts_business_id ON rent_receipts;
CREATE TRIGGER trigger_rent_receipts_business_id
  BEFORE INSERT ON rent_receipts
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_business_id();

-- Backfill existing records with business_ids
-- This will generate IDs for existing records based on their creation date

DO $$
DECLARE
  rec RECORD;
  v_date_key VARCHAR(6);
  v_counter INTEGER;
  v_business_id VARCHAR(20);
BEGIN
  -- Backfill owners
  FOR rec IN SELECT id, created_at FROM owners WHERE business_id IS NULL ORDER BY created_at
  LOOP
    v_date_key := TO_CHAR(rec.created_at, 'YYMMDD');
    v_counter := get_next_counter('PROP', v_date_key);
    v_business_id := 'PROP-' || v_date_key || '-' || LPAD(v_counter::TEXT, 5, '0');
    UPDATE owners SET business_id = v_business_id WHERE id = rec.id;
  END LOOP;
  
  -- Backfill tenants
  FOR rec IN SELECT id, created_at FROM tenants WHERE business_id IS NULL ORDER BY created_at
  LOOP
    v_date_key := TO_CHAR(rec.created_at, 'YYMMDD');
    v_counter := get_next_counter('LOC', v_date_key);
    v_business_id := 'LOC-' || v_date_key || '-' || LPAD(v_counter::TEXT, 5, '0');
    UPDATE tenants SET business_id = v_business_id WHERE id = rec.id;
  END LOOP;
  
  -- Backfill properties
  FOR rec IN SELECT id, created_at FROM properties WHERE business_id IS NULL ORDER BY created_at
  LOOP
    v_date_key := TO_CHAR(rec.created_at, 'YYMMDD');
    v_counter := get_next_counter('BIEN', v_date_key);
    v_business_id := 'BIEN-' || v_date_key || '-' || LPAD(v_counter::TEXT, 5, '0');
    UPDATE properties SET business_id = v_business_id WHERE id = rec.id;
  END LOOP;
  
  -- Backfill agencies
  FOR rec IN SELECT id, created_at FROM agencies WHERE business_id IS NULL ORDER BY created_at
  LOOP
    v_date_key := TO_CHAR(rec.created_at, 'YYMMDD');
    v_counter := get_next_counter('AGEN', v_date_key);
    v_business_id := 'AGEN-' || v_date_key || '-' || LPAD(v_counter::TEXT, 5, '0');
    UPDATE agencies SET business_id = v_business_id WHERE id = rec.id;
  END LOOP;
  
  -- Backfill contracts
  FOR rec IN SELECT id, created_at FROM contracts WHERE business_id IS NULL ORDER BY created_at
  LOOP
    v_date_key := TO_CHAR(rec.created_at, 'YYMMDD');
    v_counter := get_next_counter('CONT', v_date_key);
    v_business_id := 'CONT-' || v_date_key || '-' || LPAD(v_counter::TEXT, 5, '0');
    UPDATE contracts SET business_id = v_business_id WHERE id = rec.id;
  END LOOP;
  
  -- Backfill rent_receipts
  FOR rec IN SELECT id, created_at FROM rent_receipts WHERE business_id IS NULL ORDER BY created_at
  LOOP
    v_date_key := TO_CHAR(rec.created_at, 'YYMMDD');
    v_counter := get_next_counter('PAIE', v_date_key);
    v_business_id := 'PAIE-' || v_date_key || '-' || LPAD(v_counter::TEXT, 5, '0');
    UPDATE rent_receipts SET business_id = v_business_id WHERE id = rec.id;
  END LOOP;
END $$;

-- Make business_id NOT NULL after backfill
ALTER TABLE owners ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE tenants ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE properties ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE agencies ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE contracts ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE rent_receipts ALTER COLUMN business_id SET NOT NULL;

COMMENT ON TABLE id_counters IS 'Stores daily counters for business ID generation';
COMMENT ON FUNCTION generate_business_id IS 'Generates unique business ID in format TYPE-AAMMJJ-NNNNN';
COMMENT ON FUNCTION get_next_counter IS 'Atomically increments and returns next counter for given type and date';
