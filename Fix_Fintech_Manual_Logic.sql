-- ==============================================================================
-- GÉNÉRATION MANUELLE DES COMMISSIONS (VERSION BOUTON PAYER)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_monthly_fintech_commissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_agency RECORD;
    v_potential NUMERIC;
    v_commission NUMERIC;
    v_period TEXT;
BEGIN
    -- Définir la période actuelle (ex: '2026-05')
    v_period := to_char(NOW(), 'YYYY-MM');

    FOR r_agency IN SELECT id, name FROM public.agencies WHERE status = 'approved' LOOP
        -- Calculer le potentiel (Loyer mensuel total des contrats actifs)
        SELECT COALESCE(SUM(monthly_rent), 0)
        INTO v_potential
        FROM public.contracts
        WHERE agency_id = r_agency.id
          AND status IN ('active', 'renewed');
        
        -- Calculer la commission (1%)
        v_commission := v_potential * 0.01;
        
        IF v_commission > 0 THEN
            -- Vérifier si une commission n'existe pas déjà pour cette période
            IF NOT EXISTS (
                SELECT 1 FROM public.agency_fintech_fees 
                WHERE agency_id = r_agency.id AND period_month = v_period
            ) THEN
                -- Créer la dette "En attente"
                INSERT INTO public.agency_fintech_fees (
                    agency_id, 
                    period_month, 
                    potential_revenue, 
                    commission_amount, 
                    status
                ) VALUES (
                    r_agency.id,
                    v_period,
                    v_potential,
                    v_commission,
                    'pending'
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;
