-- Phase 9: Property Expenses & Maintenance Tracking
-- Run this in your Supabase SQL Editor

-- 1. Create property_expenses table
CREATE TABLE IF NOT EXISTS public.property_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT DEFAULT 'maintenance', -- 'maintenance', 'utilities', 'legal', 'tax', 'other'
    expense_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending_deduction', -- 'pending_deduction', 'deducted'
    receipt_id UUID REFERENCES public.rent_receipts(id) ON DELETE SET NULL, -- Link to the receipt where it was deducted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add expenses_deducted column to rent_receipts if not exists
ALTER TABLE public.rent_receipts 
ADD COLUMN IF NOT EXISTS expenses_deducted NUMERIC DEFAULT 0;

-- 3. Update comments
COMMENT ON TABLE public.property_expenses IS 'Dépenses et travaux effectués par l''agence pour le compte du propriétaire';
COMMENT ON COLUMN public.rent_receipts.expenses_deducted IS 'Somme des dépenses propriétaires déduites de ce reversement';

-- 4. RLS Policies
ALTER TABLE public.property_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies can manage their own expenses"
    ON public.property_expenses
    FOR ALL
    USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

-- Optional: Allow owners to view expenses for their properties
-- (Assuming owner_id is accessible via property)
