-- =============================================================================
-- GESTION360 - OPTIMISATION DES STATISTIQUES PLATEFORME
-- Regroupe 12 requêtes en une seule pour une performance maximale.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_platform_stats_v2()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_now TIMESTAMP := now();
    v_start_of_month TIMESTAMP := date_trunc('month', v_now);
    v_start_of_prev_month TIMESTAMP := date_trunc('month', v_now - interval '1 month');
    v_today_start TIMESTAMP := date_trunc('day', v_now);
BEGIN
    WITH 
    counts AS (
        SELECT
            (SELECT count(*) FROM public.agency_registration_requests WHERE status = 'pending') as pending_requests,
            (SELECT count(*) FROM public.agencies) as total_agencies,
            (SELECT count(*) FROM public.agencies WHERE status = 'approved') as approved_agencies,
            (SELECT count(*) FROM public.properties) as total_properties,
            (SELECT count(*) FROM public.contracts) as total_contracts,
            (SELECT count(*) FROM public.owners WHERE subscription_status = 'active') as active_owners,
            (SELECT count(*) FROM public.agencies WHERE created_at >= v_start_of_month) as current_month_agencies,
            (SELECT count(*) FROM public.agencies WHERE created_at >= v_start_of_prev_month AND created_at < v_start_of_month) as prev_month_agencies
    ),
    revenues AS (
        SELECT
            COALESCE(SUM(amount) FILTER (WHERE payment_date >= v_today_start), 0) as today_revenue,
            COALESCE(SUM(amount), 0) as total_revenue
        FROM public.subscription_payments
        WHERE status = 'completed'
    ),
    mrr_calc AS (
        -- Calcul du MRR Agences (Basé sur le plan ou le monthly_fee spécifique)
        SELECT 
            COALESCE(SUM(
                CASE 
                    WHEN monthly_fee > 0 THEN monthly_fee 
                    ELSE (
                        CASE 
                            WHEN plan_type = 'premium' THEN 50000
                            WHEN plan_type = 'enterprise' THEN 100000
                            ELSE 25000
                        END
                    )
                END
            ), 0) as agency_mrr
        FROM public.agencies
        WHERE subscription_status IN ('active', 'trial')
    )
    SELECT 
        jsonb_build_object(
            'pendingRequests', c.pending_requests,
            'totalAgencies', c.total_agencies,
            'approvedAgencies', c.approved_agencies,
            'activeAgencies', (SELECT count(*) FROM public.agencies WHERE subscription_status IN ('active', 'trial')),
            'totalProperties', c.total_properties,
            'totalContracts', c.total_contracts,
            'totalRevenue', r.total_revenue,
            'todayRevenue', r.today_revenue,
            'subscriptionRevenue', m.agency_mrr + (c.active_owners * 10000), -- MRR Agences + MRR Proprios
            'monthlyGrowth', 
                CASE 
                    WHEN c.prev_month_agencies = 0 THEN (CASE WHEN c.current_month_agencies > 0 THEN 100 ELSE 0 END)
                    ELSE ROUND(((c.current_month_agencies::float - c.prev_month_agencies::float) / c.prev_month_agencies::float * 100)::numeric, 1)
                END
        ) INTO v_result
    FROM counts c, revenues r, mrr_calc m;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_platform_stats_v2 IS 'Agrégation haute performance des statistiques pour le Dashboard Super Admin.';
