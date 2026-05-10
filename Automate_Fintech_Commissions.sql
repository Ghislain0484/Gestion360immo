-- ==============================================================================
-- SYSTÈME AUTOMATISÉ DE COMMISSION FINTECH (1%)
-- ==============================================================================

-- 1. Fonction pour calculer le CA potentiel d'une agence
CREATE OR REPLACE FUNCTION public.calculate_agency_potential(p_agency_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_potential NUMERIC;
BEGIN
    SELECT COALESCE(SUM(monthly_rent), 0)
    INTO v_potential
    FROM public.contracts
    WHERE agency_id = p_agency_id
      AND status IN ('active', 'renewed');
    
    RETURN v_potential;
END;
$$;

-- 2. Procédure pour facturer la commission mensuelle (1%)
CREATE OR REPLACE FUNCTION public.process_monthly_fintech_commissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_agency RECORD;
    v_potential NUMERIC;
    v_commission NUMERIC;
    v_wallet_id UUID;
BEGIN
    FOR r_agency IN SELECT id, name FROM public.agencies WHERE status = 'approved' LOOP
        -- Calculer le potentiel
        v_potential := public.calculate_agency_potential(r_agency.id);
        
        -- Calculer la commission (1%)
        v_commission := v_potential * 0.01;
        
        IF v_commission > 0 THEN
            -- Récupérer le portefeuille
            SELECT id INTO v_wallet_id FROM public.agency_wallets WHERE agency_id = r_agency.id;
            
            -- Si pas de portefeuille, on le crée
            IF v_wallet_id IS NULL THEN
                INSERT INTO public.agency_wallets (agency_id, balance) 
                VALUES (r_agency.id, 0) 
                RETURNING id INTO v_wallet_id;
            END IF;
            
            -- Déduire du solde (peut devenir négatif si pas assez de fonds)
            UPDATE public.agency_wallets 
            SET balance = balance - v_commission,
                updated_at = NOW()
            WHERE id = v_wallet_id;
            
            -- Enregistrer la transaction
            INSERT INTO public.wallet_transactions (
                agency_id, 
                wallet_id, 
                amount, 
                type, 
                description, 
                reference
            ) VALUES (
                r_agency.id,
                v_wallet_id,
                -v_commission,
                'usage',
                'Commission Fintech mensuelle (1%) sur CA Potentiel de ' || format_type(v_potential::text, null),
                'FIN-' || to_char(NOW(), 'YYYYMM') || '-' || substring(r_agency.id::text, 1, 4)
            );
        END IF;
    END LOOP;
END;
$$;

-- NOTE: Pour automatiser cela le 1er de chaque mois, vous pouvez utiliser 
-- l'extension 'pg_cron' de Supabase ou un Edge Function.
-- Commande manuelle pour tester : SELECT public.process_monthly_fintech_commissions();
