-- Migration for owner payouts feature

-- 1. Add payout_preference_day to owners table
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS payout_preference_day INTEGER CHECK (payout_preference_day >= 1 AND payout_preference_day <= 31);

-- 2. Create the RPC function to get upcoming payouts
CREATE OR REPLACE FUNCTION get_upcoming_payouts(p_agency_id UUID)
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

        -- Adjust for weekends (Friday if Sunday)
        -- extract(isodow from date) returns 1 (Mon) to 7 (Sun)
        IF extract(isodow from v_target_date) = 7 THEN
            v_target_date := v_target_date - interval '2 days'; -- Move Sunday to Friday
        ELSIF extract(isodow from v_target_date) = 6 THEN
            v_target_date := v_target_date - interval '1 day'; -- Move Saturday to Friday
        END IF;

        -- Ensure target date is not in the past relative to the start of the month, 
        -- actually, if it's past, maybe it's for next month? 
        -- For now, let's just stick to the current month's target date.

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
            -- Calculate balance
            
            -- Total collected for this owner (after 10% agency fee assumption, or whatever the app uses. 
            -- Actually, let's just query total collected and total paid out, and assume the front-end might adjust for fees).
            -- Let's do exact sum of `amount_paid`
            SELECT COALESCE(SUM(rr.amount_paid), 0) INTO v_total_collected
            FROM public.rent_receipts rr
            JOIN public.contracts c ON rr.contract_id = c.id
            JOIN public.properties p ON c.property_id = p.id
            WHERE p.owner_id = o.id AND rr.status = 'paid';

            -- Total paid out
            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
            FROM public.modular_transactions
            WHERE related_owner_id = o.id AND type = 'expense' AND category = 'owner_payout';

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

-- 3. Create the RPC function to mark payout as paid
CREATE OR REPLACE FUNCTION mark_owner_payout_paid(
    p_agency_id UUID,
    p_owner_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_owner_name TEXT;
    v_month_name TEXT;
BEGIN
    -- Get owner name
    SELECT first_name || ' ' || last_name INTO v_owner_name 
    FROM public.owners WHERE id = p_owner_id;

    v_month_name := to_char(current_date, 'TMmonth YYYY');

    -- Insert into modular_transactions
    INSERT INTO public.modular_transactions (
        agency_id,
        type,
        category,
        amount,
        description,
        transaction_date,
        payment_method,
        module_type,
        related_owner_id,
        created_by
    ) VALUES (
        p_agency_id,
        'expense',
        'owner_payout',
        p_amount,
        'Reversement automatique - ' || v_owner_name || ' (' || v_month_name || ')',
        current_date,
        p_payment_method,
        'agency',
        p_owner_id,
        p_user_id
    ) RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
