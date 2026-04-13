-- ==========================================================
-- OPTIMISATION PERFORMANCE GICO - DASHBOARD & RLS (V3 FINAL)
-- ==========================================================

-- 1. Création de la table owner_transactions si elle manque
-- Cette table est requise par le module de reversement propriétaire.

CREATE TABLE IF NOT EXISTS public.owner_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
    montant NUMERIC NOT NULL DEFAULT 0,
    mode_paiement TEXT,
    reference TEXT,
    description TEXT,
    notes TEXT,
    date_transaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de la sécurité (RLS) sur la nouvelle table
ALTER TABLE public.owner_transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Agency users can manage owner transactions" ON public.owner_transactions;
    CREATE POLICY "Agency users can manage owner transactions" ON public.owner_transactions
    FOR ALL USING (agency_id = (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()));
END $$;

-- 2. Indexation pour accélérer les politiques de sécurité (RLS)
-- Ces index permettent d'accélérer drastiquement les requêtes filtrées par agency_id.

CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties (agency_id);
CREATE INDEX IF NOT EXISTS idx_owners_agency_id ON public.owners (agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agency_id ON public.tenants (agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agency_id ON public.contracts (agency_id);
CREATE INDEX IF NOT EXISTS idx_rent_receipts_agency_id ON public.rent_receipts (agency_id);
CREATE INDEX IF NOT EXISTS idx_modular_transactions_agency_id ON public.modular_transactions (agency_id);
CREATE INDEX IF NOT EXISTS idx_owner_transactions_agency_id ON public.owner_transactions (agency_id);

-- 3. Fonction RPC consolidée pour le Dashboard (v3)
-- Cette fonction remplace 7 appels client-side par 1 seul appel serveur.

DROP FUNCTION IF EXISTS get_dashboard_stats_v3(UUID);
CREATE OR REPLACE FUNCTION get_dashboard_stats_v3(p_agency_id UUID)
RETURNS JSON AS $$
DECLARE
    v_start_date DATE := date_trunc('month', current_date);
    v_end_date DATE := (date_trunc('month', current_date) + interval '1 month - 1 day')::DATE;
    v_result JSON;
BEGIN
    WITH stats AS (
        SELECT
            (SELECT COUNT(*)::INT FROM public.properties WHERE agency_id = p_agency_id) as total_props,
            (SELECT COUNT(*)::INT FROM public.owners WHERE agency_id = p_agency_id) as total_owns,
            (SELECT COUNT(*)::INT FROM public.tenants WHERE agency_id = p_agency_id) as total_tens,
            (SELECT COUNT(*)::INT FROM public.contracts WHERE agency_id = p_agency_id) as total_cnts,
            (SELECT COUNT(*)::INT FROM public.contracts WHERE agency_id = p_agency_id AND status IN ('active', 'renewed')) as active_cnts
    ),
    receipt_sums AS (
        SELECT 
            COALESCE(SUM(rent_amount + charges + agency_fees), 0) as rent_rev,
            COALESCE(SUM(deposit_amount), 0) as total_deps,
            COALESCE(SUM(commission_amount + agency_fees), 0) as rent_earns
        FROM public.rent_receipts 
        WHERE agency_id = p_agency_id 
        AND payment_date >= v_start_date 
        AND payment_date <= v_end_date
    ),
    modular_sums AS (
        SELECT 
            COALESCE(SUM(CASE WHEN (type IN ('income', 'credit') AND category NOT IN ('caution', 'deposit', 'payout')) THEN amount ELSE 0 END), 0) as mod_rev,
            COALESCE(SUM(CASE WHEN (category IN ('agency_fees', 'commission', 'fees', 'honoraires', 'frais')) THEN amount ELSE 0 END), 0) as mod_earns
        FROM public.modular_transactions
        WHERE agency_id = p_agency_id
        AND transaction_date >= v_start_date
        AND transaction_date <= v_end_date
    ),
    expected AS (
        SELECT COALESCE(SUM(monthly_rent), 0) as expected_rev
        FROM public.contracts
        WHERE agency_id = p_agency_id 
        AND status IN ('active', 'renewed') 
        AND type = 'location'
    ),
    occupancy AS (
        SELECT 
            CASE 
                WHEN (SELECT total_props FROM stats) > 0 THEN 
                    ROUND((COUNT(DISTINCT property_id)::NUMERIC / (SELECT total_props FROM stats)::NUMERIC) * 100, 2)
                ELSE 0 
            END as rate
        FROM public.contracts
        WHERE agency_id = p_agency_id 
        AND status IN ('active', 'renewed') 
        AND type = 'location'
    )
    SELECT json_build_object(
        'totalProperties', s.total_props,
        'totalOwners', s.total_owns,
        'totalTenants', s.total_tens,
        'totalContracts', s.total_cnts,
        'monthlyRevenue', r.rent_rev + m.mod_rev,
        'expectedRevenue', e.expected_rev,
        'remainingRevenue', GREATEST(0, e.expected_rev - r.rent_rev),
        'activeContracts', s.active_cnts,
        'occupancyRate', o.rate,
        'totalDeposits', r.total_deps,
        'agencyEarnings', r.rent_earns + m.mod_earns
    ) INTO v_result
    FROM stats s, receipt_sums r, modular_sums m, expected e, occupancy o;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Optimisation de la récupération des quittances (Sécurité renforcée)
-- Cette fonction permet de bypasser les lenteurs RLS pour les rapports agence.

DROP FUNCTION IF EXISTS get_rent_receipts_by_agency(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
CREATE OR REPLACE FUNCTION get_rent_receipts_by_agency(
    p_agency_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF public.rent_receipts AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.rent_receipts
    WHERE agency_id = p_agency_id
    AND (payment_date >= p_start_date OR p_start_date IS NULL)
    AND (payment_date <= p_end_date OR p_end_date IS NULL)
    ORDER BY payment_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
