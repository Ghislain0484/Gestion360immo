-- =============================================================
-- CAISSE & AGENCY ROBUSTNESS FIX
-- =============================================================

-- 1. Ensure Directors can manage their own agency_users entries
-- This is critical for AuthContext.tsx upsert to work for new accounts.
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Directors can manage their agency users" ON public.agency_users;
    CREATE POLICY "Directors can manage their agency users" ON public.agency_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.agencies 
            WHERE director_id = auth.uid() 
            AND agency_id = public.agency_users.agency_id
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agencies 
            WHERE director_id = auth.uid() 
            AND agency_id = public.agency_users.agency_id
        )
    );
END $$;

-- 2. Ensure modular_transactions has correct indexes for performance
CREATE INDEX IF NOT EXISTS idx_modular_trans_agency ON public.modular_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_modular_trans_module ON public.modular_transactions(module_type);
CREATE INDEX IF NOT EXISTS idx_modular_trans_date ON public.modular_transactions(transaction_date DESC);

-- 3. Fix potential type mismatch for 'payout' in some contexts
-- Ensure the check constraint on type allows standard bookkeeping terms
ALTER TABLE public.modular_transactions DROP CONSTRAINT IF EXISTS modular_transactions_type_check;
ALTER TABLE public.modular_transactions ADD CONSTRAINT modular_transactions_type_check 
CHECK (type IN ('income', 'expense', 'credit', 'debit', 'deposit', 'withdrawal', 'payout'));

SELECT 'Robustness Fixes (Caisse & Auth) Applied' as status;
