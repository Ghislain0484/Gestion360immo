-- Migration: Unify Finance Schema (modular_transactions)
-- This migration adds missing columns to modular_transactions to support the main Caisse module.

-- 1. Add missing columns
ALTER TABLE IF EXISTS public.modular_transactions 
ADD COLUMN IF NOT EXISTS related_owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add next_payment_date to contracts if missing
ALTER TABLE IF EXISTS public.contracts 
ADD COLUMN IF NOT EXISTS next_payment_date DATE;

-- 2. Update type constraint to allow 'credit' and 'debit'
-- Note: We first drop the old constraint and add a new one.
DO $$ 
BEGIN
    ALTER TABLE public.modular_transactions DROP CONSTRAINT IF EXISTS modular_transactions_type_check;
    ALTER TABLE public.modular_transactions ADD CONSTRAINT modular_transactions_type_check 
        CHECK (type IN ('income', 'expense', 'deposit', 'transfer', 'salary', 'credit', 'debit'));
EXCEPTION
    WHEN undefined_object THEN
        -- Fallback if constraint had a different name
        NULL;
END $$;

-- 3. Ensure RLS is still active and correct (it was already enabled in previous migrations)
-- We don't need to change policies if they use check_agency_access(agency_id).

-- 4. Audit Log for this change
SELECT 'Schema Unified: modular_transactions now supports agency financial tracking' AS status;
