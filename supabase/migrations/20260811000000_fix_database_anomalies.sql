-- =============================================================================
-- GESTION360 - MIGRATION DE CORRECTION DE BASE DE DONNÉES ET CAISSE
-- =============================================================================

BEGIN;

-- 1. CRÉATION DE LA TABLE INVENTORIES (ÉTATS DES LIEUX)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'completed', 'signed')),
    notes TEXT,
    rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
    meter_readings JSONB DEFAULT '{}'::jsonb,
    keys_count INT DEFAULT 0,
    signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activation RLS
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_inventories_agency_id ON public.inventories(agency_id);
CREATE INDEX IF NOT EXISTS idx_inventories_property_id ON public.inventories(property_id);

-- Politique de sécurité RLS
DROP POLICY IF EXISTS "agency_member_all_inventories" ON public.inventories;
CREATE POLICY "agency_member_all_inventories" ON public.inventories 
FOR ALL TO authenticated 
USING (public.is_agency_member(agency_id)) 
WITH CHECK (public.is_agency_member(agency_id));


-- 2. CORRECTION DE LA FONCTION RPC get_upcoming_payouts
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_upcoming_payouts(p_agency_id UUID)
RETURNS TABLE (
    owner_id UUID,
    first_name TEXT,
    last_name TEXT,
    payment_mode TEXT,
    payout_preference_day INT,
    target_date DATE,
    alert_level TEXT, -- 'urgent', 'warning', 'info'
    balance NUMERIC
) AS $$
DECLARE
    current_dt DATE := current_date;
    v_target_date DATE;
    v_alert_level TEXT;
    o RECORD;
    v_balance NUMERIC;
    v_total_collected NUMERIC;
    v_total_paid NUMERIC;
BEGIN
    FOR o IN 
        SELECT id, first_name, last_name, payment_mode, payout_preference_day 
        FROM public.owners 
        WHERE agency_id = p_agency_id AND payout_preference_day IS NOT NULL
    LOOP
        -- Calculate the target date for the current month
        BEGIN
            v_target_date := make_date(
                extract(year from current_dt)::int, 
                extract(month from current_dt)::int, 
                o.payout_preference_day
            );
        EXCEPTION WHEN datetime_field_overflow THEN
            -- If preference is 31 and month has 30 days, clamp to last day of month
            v_target_date := (date_trunc('month', current_dt) + interval '1 month - 1 day')::date;
        END;

        -- Adjust for weekends (Friday if Sunday/Saturday)
        -- extract(isodow from date) returns 1 (Mon) to 7 (Sun)
        IF extract(isodow from v_target_date) = 7 THEN
            v_target_date := v_target_date - 2; -- Move Sunday to Friday
        ELSIF extract(isodow from v_target_date) = 6 THEN
            v_target_date := v_target_date - 1; -- Move Saturday to Friday
        END IF;

        v_alert_level := NULL;
        IF o.payment_mode = 'virement_bancaire' THEN
            -- 3 days before
            IF v_target_date - current_dt <= 3 AND v_target_date >= current_dt THEN
                v_alert_level := CASE WHEN v_target_date = current_dt THEN 'urgent' ELSE 'warning' END;
            ELSIF current_dt > v_target_date THEN
                v_alert_level := 'urgent'; -- overdue
            END IF;
        ELSIF o.payment_mode = 'retrait_physique' THEN
            -- 2 days before
            IF v_target_date - current_dt <= 2 AND v_target_date >= current_dt THEN
                v_alert_level := CASE WHEN v_target_date = current_dt THEN 'urgent' ELSE 'warning' END;
            ELSIF current_dt > v_target_date THEN
                v_alert_level := 'urgent';
            END IF;
        ELSE 
            -- Mobile Money or others: 0 days
            IF v_target_date - current_dt <= 0 AND v_target_date >= current_dt THEN
                v_alert_level := 'urgent';
            ELSIF current_dt > v_target_date THEN
                v_alert_level := 'urgent';
            END IF;
        END IF;

        IF v_alert_level IS NOT NULL THEN
            -- Calculate balance (Sum of owner parts on receipts vs actual payouts in caisse)
            SELECT COALESCE(SUM(COALESCE(rr.owner_payment, rr.amount_paid * 0.9)), 0) INTO v_total_collected
            FROM public.rent_receipts rr
            JOIN public.contracts c ON rr.contract_id = c.id
            JOIN public.properties p ON c.property_id = p.id
            WHERE p.owner_id = o.id AND COALESCE(rr.payment_status, 'paid') != 'unpaid';

            -- Total paid out (Check both 'expense' and 'debit' types for owner payouts)
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
            FROM public.modular_transactions
            WHERE related_owner_id = o.id 
              AND type IN ('expense', 'debit') 
              AND category = 'owner_payout';

            v_balance := v_total_collected - v_total_paid;
            
            -- Only alert if there is a positive balance to pay
            IF v_balance > 0 THEN
                owner_id := o.id;
                first_name := o.first_name;
                last_name := o.last_name;
                payment_mode := o.payment_mode;
                payout_preference_day := o.payout_preference_day;
                target_date := v_target_date;
                alert_level := v_alert_level;
                balance := v_balance;
                RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. CRÉATION DU RPC DE CONFIRMATION SÉCURISÉE DES ENCAISSEMENTS LOCATAIRES (SECURITY DEFINER)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.confirm_tenant_payment(
    p_receipt_id UUID,
    p_transaction_id TEXT,
    p_gateway_name TEXT,
    p_amount NUMERIC
)
RETURNS public.rent_receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_receipt public.rent_receipts;
    v_contract public.contracts;
    v_tenant public.tenants;
    v_agency_id UUID;
BEGIN
    -- 1. Fetch the receipt
    SELECT * INTO v_receipt FROM public.rent_receipts WHERE id = p_receipt_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facture introuvable.';
    END IF;

    -- 2. Check if already paid
    IF v_receipt.payment_status = 'paid' THEN
        RETURN v_receipt;
    END IF;

    -- 3. Resolve missing agency_id relations
    SELECT * INTO v_contract FROM public.contracts WHERE id = v_receipt.contract_id;
    SELECT * INTO v_tenant FROM public.tenants WHERE id = v_receipt.tenant_id;
    v_agency_id := COALESCE(v_receipt.agency_id, v_contract.agency_id, v_tenant.agency_id);

    -- 4. Update the receipt (Bypass RLS securely)
    UPDATE public.rent_receipts
    SET 
        payment_status = 'paid',
        amount_paid = p_amount,
        balance_due = 0,
        payment_date = CURRENT_DATE,
        payment_method = 'mobile_money',
        agency_id = COALESCE(agency_id, v_agency_id),
        notes = COALESCE(notes, '') || E'\n' || 'Réglement en ligne sécurisé via ' || p_gateway_name || '. Réf: ' || p_transaction_id
    WHERE id = p_receipt_id
    RETURNING * INTO v_receipt;

    -- 5. Insert into modular_transactions (Bypass RLS securely)
    INSERT INTO public.modular_transactions (
        agency_id,
        created_by,
        type,
        amount,
        category,
        description,
        transaction_date,
        payment_method,
        related_tenant_id,
        related_owner_id,
        related_property_id,
        module_type
    ) VALUES (
        v_receipt.agency_id,
        v_receipt.issued_by,
        'income',
        p_amount,
        'rent_payment',
        'Paiement Loyer en ligne (' || p_gateway_name || ') - ' || COALESCE(v_tenant.first_name || ' ' || v_tenant.last_name, 'Locataire') || ' (Réf: ' || p_transaction_id || ')',
        CURRENT_DATE,
        'mobile_money',
        v_receipt.tenant_id,
        v_receipt.owner_id,
        v_receipt.property_id,
        'caisse'
    );

    RETURN v_receipt;
END;
$$;

-- Autoriser l'exécution publique/anonyme
GRANT EXECUTE ON FUNCTION public.confirm_tenant_payment(UUID, TEXT, TEXT, NUMERIC) TO anon, authenticated;


-- 4. ASSOUPLISSEMENT DES ACCÈS AUX AUDIT LOGS POUR LES MEMBRES D'AGENCE
-- =============================================================================
DROP POLICY IF EXISTS "audit_logs_director_read" ON public.audit_logs;
CREATE POLICY "audit_logs_director_read" ON public.audit_logs FOR SELECT TO authenticated 
USING (
    public.is_platform_admin() 
    OR public.is_agency_member(agency_id)
    OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

COMMIT;
