-- Migration: Fix RLS policies for modular tables using SECURITY DEFINER

-- 1. Create a SECURITY DEFINER function to reliably check agency membership
-- This bypasses any RLS policies on the agency_users table itself
CREATE OR REPLACE FUNCTION public.check_agency_access(p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
END;
$$;

-- 2. Enable RLS on all modular tables
ALTER TABLE IF EXISTS public.residence_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.residence_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.modular_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.residence_expenses ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies
DO $$ 
DECLARE
    ttext TEXT;
BEGIN
    FOR ttext IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
            'residence_sites', 'residence_units', 'hotel_rooms', 'modular_bookings', 'residence_expenses'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Access for agency users" ON public.%I', ttext);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all actions for agency users" ON public.%I', ttext);
    END LOOP;
END $$;

-- 4. Create universal policies checking our function
CREATE POLICY "Access for agency users" ON public.residence_sites
FOR ALL USING (public.check_agency_access(agency_id));

CREATE POLICY "Access for agency users" ON public.residence_units
FOR ALL USING (public.check_agency_access(agency_id));

CREATE POLICY "Access for agency users" ON public.hotel_rooms
FOR ALL USING (public.check_agency_access(agency_id));

CREATE POLICY "Access for agency users" ON public.modular_bookings
FOR ALL USING (public.check_agency_access(agency_id));

CREATE POLICY "Access for agency users" ON public.residence_expenses
FOR ALL USING (public.check_agency_access(agency_id));

