-- ==========================================
-- MIGRATION : STRUCTURE FINANCIERE COMPLETE
-- ==========================================
-- Cible : Gestion des quittances, commissions et dépenses
-- Date : 2026-03-24
-- ==========================================

BEGIN;

-- 1. Table des dépenses (Indispensable pour ReceiptGenerator Phase 20)
CREATE TABLE IF NOT EXISTS public.property_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT DEFAULT 'maintenance',
    expense_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending_deduction',
    receipt_id UUID REFERENCES public.rent_receipts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Colonnes comptables dans rent_receipts (Attendues par le code API)
ALTER TABLE public.rent_receipts 
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS agency_fees NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS expenses_deducted NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_payment NUMERIC DEFAULT 0;

-- 3. RLS pour property_expenses
ALTER TABLE public.property_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can manage their own expenses" ON public.property_expenses;
CREATE POLICY "Agencies can manage their own expenses"
    ON public.property_expenses
    FOR ALL
    TO authenticated
    USING (
        agency_id IN (
            SELECT agency_id FROM public.agency_users
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        agency_id IN (
            SELECT agency_id FROM public.agency_users
            WHERE user_id = auth.uid()
        )
    );

-- 4. RPC get_rent_receipts_by_agency (Mise à jour avec nouvelles colonnes)
DROP FUNCTION IF EXISTS get_rent_receipts_by_agency(uuid, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_rent_receipts_by_agency(
  p_agency_id uuid,
  p_start_date timestamptz DEFAULT null,
  p_end_date timestamptz DEFAULT null
)
RETURNS TABLE (
  total_amount numeric,
  rent_amount numeric,
  charges numeric,
  commission_amount numeric,
  agency_fees numeric,
  deposit_amount numeric,
  owner_payment numeric,
  expenses_deducted numeric,
  period_month int,
  period_year int,
  contract_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rr.total_amount, 
    rr.rent_amount, 
    rr.charges, 
    rr.commission_amount, 
    rr.agency_fees,
    rr.deposit_amount,
    rr.owner_payment,
    rr.expenses_deducted,
    rr.period_month, 
    rr.period_year, 
    rr.contract_id
  FROM rent_receipts rr
  WHERE rr.agency_id = p_agency_id
    AND (p_start_date IS NULL OR rr.payment_date >= p_start_date)
    AND (p_end_date IS NULL OR rr.payment_date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- 5. RLS pour rent_receipts (Vérification et renforcement)
DROP POLICY IF EXISTS rent_receipts_select_policy ON public.rent_receipts;
CREATE POLICY rent_receipts_select_policy ON public.rent_receipts
    FOR SELECT TO authenticated
    USING (
        agency_id IN (
            SELECT agency_id FROM public.agency_users
            WHERE user_id = auth.uid()
        )
    );

COMMIT;

-- Verification rapide
SELECT 'Migration terminée avec succès' as result;
