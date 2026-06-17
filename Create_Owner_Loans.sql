-- Phase 23: Owner Loans & Advances System
-- 1. Create owner_loans table if not exists
CREATE TABLE IF NOT EXISTS public.owner_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    interest_rate NUMERIC DEFAULT 0 CHECK (interest_rate >= 0),
    monthly_repayment_amount NUMERIC DEFAULT 0 CHECK (monthly_repayment_amount >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    description TEXT, -- Service agreement details / "entente de service", etc.
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'written_off')),
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add comment
COMMENT ON TABLE public.owner_loans IS 'Prêts et avances consentis par l''agence aux propriétaires';

-- 3. Enable RLS
ALTER TABLE public.owner_loans ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "owner_loans_agency_access" ON public.owner_loans;
DROP POLICY IF EXISTS "owner_loans_owner_read" ON public.owner_loans;

-- 5. Create RLS policies
CREATE POLICY "owner_loans_agency_access" ON public.owner_loans
    FOR ALL TO authenticated
    USING (
        public.is_agency_member(agency_id) 
        OR public.is_platform_admin()
    )
    WITH CHECK (
        public.is_agency_member(agency_id) 
        OR public.is_platform_admin()
    );

CREATE POLICY "owner_loans_owner_read" ON public.owner_loans
    FOR SELECT TO authenticated
    USING (
        owner_id IN (
            SELECT id FROM public.owners 
            WHERE user_id = auth.uid() 
            OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR public.is_platform_admin()
    );
