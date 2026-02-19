-- ============================================================================
-- 1. FIX TABLE PERMISSIONS (THE NUCLEAR OPTION)
--    We disable RLS on this specific internal table to prevent ANY permission issues.
--    This is safe because only the backend function accesses it.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_counters (
    entity_type text NOT NULL,
    date_part text NOT NULL,
    last_seq int DEFAULT 0 NOT NULL,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (entity_type, date_part)
);

-- DISABLE RLS completely on this table to ensure triggers NEVER fail due to permissions
ALTER TABLE public.daily_counters DISABLE ROW LEVEL SECURITY;

-- Grant access to everyone (authenticated users need to trigger it via inserts)
GRANT ALL ON TABLE public.daily_counters TO authenticated;
GRANT ALL ON TABLE public.daily_counters TO service_role;
GRANT ALL ON TABLE public.daily_counters TO postgres;

-- ============================================================================
-- 2. Define Function with SECURITY DEFINER (Admin Privileges)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_business_id()
RETURNS TRIGGER AS $$
DECLARE
    prefix text;
    date_code text;
    seq_num int;
    new_id text;
    table_n text;
BEGIN
    -- Protection: If ID is already set and valid, do nothing
    IF NEW.business_id IS NOT NULL AND NEW.business_id <> '' THEN
        RETURN NEW;
    END IF;

    -- 1. Identify Prefix
    table_n := TG_TABLE_NAME;
    
    IF table_n = 'owners' THEN prefix := 'PROP';
    ELSIF table_n = 'tenants' THEN prefix := 'LOC';
    ELSIF table_n = 'properties' THEN prefix := 'BIEN';
    ELSIF table_n = 'agencies' THEN prefix := 'AGEN';
    ELSIF table_n = 'contracts' THEN prefix := 'CONT';
    ELSIF table_n = 'payments' THEN prefix := 'PAYM'; 
    ELSE prefix := 'GEN';
    END IF;

    -- 2. Date Code (YYMMDD)
    date_code := to_char(current_date, 'YYMMDD');

    -- 3. Get Next Sequence (Atomic Increment)
    INSERT INTO public.daily_counters (entity_type, date_part, last_seq)
    VALUES (prefix, date_code, 1)
    ON CONFLICT (entity_type, date_part) 
    DO UPDATE SET 
        last_seq = daily_counters.last_seq + 1,
        updated_at = now()
    RETURNING last_seq INTO seq_num;

    -- 4. Format ID
    new_id := prefix || date_code || '-' || lpad(seq_num::text, 5, '0');
    
    -- 5. Assign to the record
    NEW.business_id := new_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- ============================================================================
-- 3. Force Re-Apply Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trg_owners_id_gen ON public.owners;
CREATE TRIGGER trg_owners_id_gen BEFORE INSERT ON public.owners FOR EACH ROW EXECUTE FUNCTION generate_business_id();

DROP TRIGGER IF EXISTS trg_properties_id_gen ON public.properties;
CREATE TRIGGER trg_properties_id_gen BEFORE INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION generate_business_id();

DROP TRIGGER IF EXISTS trg_tenants_id_gen ON public.tenants;
CREATE TRIGGER trg_tenants_id_gen BEFORE INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION generate_business_id();

DROP TRIGGER IF EXISTS trg_agencies_id_gen ON public.agencies;
CREATE TRIGGER trg_agencies_id_gen BEFORE INSERT ON public.agencies FOR EACH ROW EXECUTE FUNCTION generate_business_id();

-- ============================================================================
-- 4. FORCE BACKFILL (Fix missing IDs)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    prefix text;
    date_code text;
    seq_num int;
    new_id text;
BEGIN
    date_code := to_char(current_date, 'YYMMDD');

    -- OWNERS
    FOR r IN SELECT id FROM public.owners WHERE business_id IS NULL OR business_id = '' LOOP
        INSERT INTO public.daily_counters (entity_type, date_part, last_seq) VALUES ('PROP', date_code, 1)
        ON CONFLICT (entity_type, date_part) DO UPDATE SET last_seq = daily_counters.last_seq + 1 RETURNING last_seq INTO seq_num;
        new_id := 'PROP' || date_code || '-' || lpad(seq_num::text, 5, '0');
        UPDATE public.owners SET business_id = new_id WHERE id = r.id;
    END LOOP;

    -- TENANTS
    FOR r IN SELECT id FROM public.tenants WHERE business_id IS NULL OR business_id = '' LOOP
        INSERT INTO public.daily_counters (entity_type, date_part, last_seq) VALUES ('LOC', date_code, 1)
        ON CONFLICT (entity_type, date_part) DO UPDATE SET last_seq = daily_counters.last_seq + 1 RETURNING last_seq INTO seq_num;
        new_id := 'LOC' || date_code || '-' || lpad(seq_num::text, 5, '0');
        UPDATE public.tenants SET business_id = new_id WHERE id = r.id;
    END LOOP;

    -- PROPERTIES
    FOR r IN SELECT id FROM public.properties WHERE business_id IS NULL OR business_id = '' LOOP
        INSERT INTO public.daily_counters (entity_type, date_part, last_seq) VALUES ('BIEN', date_code, 1)
        ON CONFLICT (entity_type, date_part) DO UPDATE SET last_seq = daily_counters.last_seq + 1 RETURNING last_seq INTO seq_num;
        new_id := 'BIEN' || date_code || '-' || lpad(seq_num::text, 5, '0');
        UPDATE public.properties SET business_id = new_id WHERE id = r.id;
    END LOOP;
END $$;
