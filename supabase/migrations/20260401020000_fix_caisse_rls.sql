-- =============================================================
-- FINAL CAISSE RLS FIX
-- =============================================================

-- 1. Ensure the modular_transactions table has robust policy for INSERT
-- The "Access for agency users" policy is recreated with explicit WITH CHECK 
-- to allow INSERT operations for authenticated users who pass the check.

DO $$ 
BEGIN
    -- Drop the old policy if it exists (it might have been created without WITH CHECK)
    DROP POLICY IF EXISTS "Access for agency users" ON public.modular_transactions;
    
    -- Create the comprehensive policy
    CREATE POLICY "Access for agency users" ON public.modular_transactions
    FOR ALL 
    TO authenticated
    USING (public.check_agency_access(agency_id))
    WITH CHECK (public.check_agency_access(agency_id));
    
    -- Grant necessary permissions just in case
    GRANT ALL ON public.modular_transactions TO authenticated;
    GRANT ALL ON public.modular_transactions TO service_role;
END $$;

-- 2. Verify check_agency_access is reachable
GRANT EXECUTE ON FUNCTION public.check_agency_access(UUID) TO authenticated;

SELECT 'Caisse RLS Fix Applied (FOR ALL with WITH CHECK)' as status;
