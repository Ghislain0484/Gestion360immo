-- FINANCIAL & CRM 360 INTEGRATION FOR RESIDENCES
-- This script adds tables for detailed expense tracking and enhanced client management

-- 1. EXPENSE TRACKING FOR SITES AND UNITS
CREATE TABLE IF NOT EXISTS public.residence_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id),
    site_id UUID REFERENCES public.residence_sites(id),
    unit_id UUID REFERENCES public.residence_units(id), -- Optional: if expense is unit-specific
    category TEXT NOT NULL, -- 'CIE' (Electricity), 'SODECI' (Water), 'Maintenance', 'Salaires', 'Fournitures', 'Autres'
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    supplier_name TEXT,
    invoice_url TEXT, -- Link to uploaded invoice document
    payment_status TEXT DEFAULT 'unpaid', -- 'paid', 'unpaid', 'partially_paid'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ENHANCED CLIENT CRM (LINKED TO TENANTS/USERS)
-- Residents are often treated differently than long-term tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS client_preferences JSONB DEFAULT '{}';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS identity_document_url TEXT; 
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- 3. FINANCIAL SUMMARY VIEW FOR SITES
-- (Optional View for reporting)
CREATE OR REPLACE VIEW public.site_financial_summary AS
SELECT 
    s.id as site_id,
    s.name as site_name,
    COALESCE(SUM(b.total_amount), 0) as total_revenue,
    COALESCE((SELECT SUM(amount) FROM public.residence_expenses WHERE site_id = s.id), 0) as total_expenses,
    (COALESCE(SUM(b.total_amount), 0) - COALESCE((SELECT SUM(amount) FROM public.residence_expenses WHERE site_id = s.id), 0)) as net_profit
FROM public.residence_sites s
LEFT JOIN public.residence_units u ON u.site_id = s.id
LEFT JOIN public.modular_bookings b ON b.residence_id = u.id AND b.booking_status = 'confirmed'
GROUP BY s.id, s.name;

-- 4. RLS POLICIES FOR EXPENSES
ALTER TABLE public.residence_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency users manage their expenses" ON public.residence_expenses
FOR ALL USING (agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
SELECT 'Financial & CRM 360 Schema Applied' as status;
