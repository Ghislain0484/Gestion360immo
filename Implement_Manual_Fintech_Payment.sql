-- ==============================================================================
-- SYSTÈME DE PAIEMENT MANUEL DES COMMISSIONS (BOUTON PAYER)
-- ==============================================================================

-- 1. Table des dettes de commissions
CREATE TABLE IF NOT EXISTS public.agency_fintech_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    period_month TEXT NOT NULL, -- Format 'YYYY-MM'
    potential_revenue NUMERIC DEFAULT 0,
    commission_amount NUMERIC DEFAULT 0, -- Les 1%
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    transaction_id UUID -- Lien vers wallet_transactions une fois payé
);

-- 2. Fonction pour qu'une agence "PAYE" sa commission depuis son portefeuille
CREATE OR REPLACE FUNCTION public.pay_fintech_commission(p_fee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fee RECORD;
    v_wallet_id UUID;
    v_balance NUMERIC;
    v_trans_id UUID;
BEGIN
    -- Récupérer la dette
    SELECT * INTO v_fee FROM public.agency_fintech_fees WHERE id = p_fee_id AND status = 'pending';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Dette non trouvée ou déjà payée');
    END IF;

    -- Récupérer le portefeuille
    SELECT id, balance INTO v_wallet_id, v_balance FROM public.agency_wallets WHERE agency_id = v_fee.agency_id;
    
    -- Vérifier le solde
    IF v_balance < v_fee.commission_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant dans votre caisse virtuelle. Veuillez recharger.');
    END IF;

    -- Déduire du portefeuille
    UPDATE public.agency_wallets SET balance = balance - v_fee.commission_amount WHERE id = v_wallet_id;

    -- Créer la transaction
    INSERT INTO public.wallet_transactions (
        agency_id, wallet_id, amount, type, description, reference
    ) VALUES (
        v_fee.agency_id, v_wallet_id, -v_fee.commission_amount, 'usage', 
        'Paiement Commission Fintech 1% - Période ' || v_fee.period_month,
        'PAY-' || to_char(NOW(), 'YYYYMMDD') || '-' || substring(p_fee_id::text, 1, 4)
    ) RETURNING id INTO v_trans_id;

    -- Marquer la dette comme payée
    UPDATE public.agency_fintech_fees 
    SET status = 'paid', paid_at = NOW(), transaction_id = v_trans_id 
    WHERE id = p_fee_id;

    RETURN jsonb_build_object('success', true, 'transaction_id', v_trans_id);
END;
$$;

-- 3. VUE pour corriger l'erreur 400 (Jointure simplifiée)
DROP VIEW IF EXISTS public.view_platform_admins;
CREATE VIEW public.view_platform_admins AS
SELECT 
    pa.*,
    u.email,
    u.first_name,
    u.last_name
FROM public.platform_admins pa
LEFT JOIN public.users u ON pa.user_id = u.id;

-- Donner les accès à la vue
GRANT SELECT ON public.view_platform_admins TO authenticated;
GRANT SELECT ON public.view_platform_admins TO service_role;
