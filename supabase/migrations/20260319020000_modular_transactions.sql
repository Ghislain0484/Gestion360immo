-- Migration: Create modular_transactions table for unified cash management
-- This tracks all money in/out for Residences and Hotels.

CREATE TABLE IF NOT EXISTS public.modular_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.residence_sites(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'deposit', 'transfer', 'salary')),
    category TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT DEFAULT 'cash', -- 'cash', 'mobile_money', 'bank', etc.
    related_id UUID, -- Link to booking_id, expense_id, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_modular_transactions_agency_date ON public.modular_transactions(agency_id, transaction_date);

-- Enable RLS
ALTER TABLE public.modular_transactions ENABLE ROW LEVEL SECURITY;

-- Consistent RLS policy
CREATE POLICY "Access for agency users" ON public.modular_transactions
FOR ALL USING (public.check_agency_access(agency_id));

-- Trigger to auto-create transaction from booking?
-- For now, we'll do it via service logic for more control (e.g. handling partial payments).
