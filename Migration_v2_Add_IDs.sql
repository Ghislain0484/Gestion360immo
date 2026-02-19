-- =========================================================
-- MIGRATION SCRIPT: ADD ID SYSTEM & MISSING COLUMNS
-- =========================================================
-- Run this script to update your existing database with the new ID logic.
-- It is safe to run multiple times (idempotent).

-- 1. Create ID Generation Function
CREATE OR REPLACE FUNCTION generate_business_id()
RETURNS TRIGGER AS $$
DECLARE
    prefix text;
    date_part text;
    seq_num int;
    new_id text;
    table_n text;
BEGIN
    table_n := TG_TABLE_NAME;
    
    IF table_n = 'owners' THEN prefix := 'PROP';
    ELSIF table_n = 'tenants' THEN prefix := 'LOC';
    ELSIF table_n = 'properties' THEN prefix := 'BIEN';
    ELSIF table_n = 'agencies' THEN prefix := 'AGEN';
    ELSIF table_n = 'contracts' THEN prefix := 'CONT';
    ELSE prefix := 'GEN';
    END IF;

    date_part := to_char(current_date, 'YYMMDD');

    -- Find the max sequence for this prefix/date configuration
    EXECUTE format('
        SELECT COALESCE(MAX(SUBSTRING(business_id FROM 12)::int), 0) + 1
        FROM public.%I
        WHERE business_id LIKE %L || %L || ''-%%''
    ', table_n, prefix, date_part) INTO seq_num;

    new_id := prefix || date_part || '-' || lpad(seq_num::text, 5, '0');
    
    NEW.business_id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add 'business_id' column to tables if not exists
DO $$
BEGIN
    -- Agencies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agencies' AND column_name='business_id') THEN
        ALTER TABLE public.agencies ADD COLUMN business_id text UNIQUE;
        CREATE TRIGGER trg_agencies_id_gen BEFORE INSERT ON public.agencies FOR EACH ROW EXECUTE FUNCTION generate_business_id();
    END IF;

    -- Owners
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='owners' AND column_name='business_id') THEN
        ALTER TABLE public.owners ADD COLUMN business_id text UNIQUE;
        CREATE TRIGGER trg_owners_id_gen BEFORE INSERT ON public.owners FOR EACH ROW EXECUTE FUNCTION generate_business_id();
    END IF;

    -- Tenants
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='business_id') THEN
        ALTER TABLE public.tenants ADD COLUMN business_id text UNIQUE;
        CREATE TRIGGER trg_tenants_id_gen BEFORE INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION generate_business_id();
    END IF;

    -- Properties
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='business_id') THEN
        ALTER TABLE public.properties ADD COLUMN business_id text UNIQUE;
        CREATE TRIGGER trg_properties_id_gen BEFORE INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION generate_business_id();
    END IF;
END $$;

-- 3. Ensure ENUMs exist (Safe creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_standing') THEN
    CREATE TYPE property_standing AS ENUM ('economique','moyen','haut');
  END IF;
  -- Add other types if needed, similar pattern...
END $$;
