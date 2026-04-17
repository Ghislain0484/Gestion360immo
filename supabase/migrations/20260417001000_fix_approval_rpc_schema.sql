
-- Fix for the approval RPC to match the mandatory columns in 'agencies'
CREATE OR REPLACE FUNCTION public.approve_agency_request(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_agency_id uuid;
    v_plan text;
    v_price numeric;
    v_next_payment_date date;
BEGIN
    -- 1. Fetch the request
    SELECT * INTO v_request 
    FROM public.agency_registration_requests 
    WHERE id = p_request_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;

    -- 2. Determine Plan Details
    v_plan := COALESCE(v_request.plan_type, 'starter');
    IF v_plan = 'pro' THEN v_price := 45000;
    ELSIF v_plan = 'enterprise' THEN v_price := 95000;
    ELSE v_price := 25000; END IF;
    
    v_next_payment_date := CURRENT_DATE + INTERVAL '60 days';

    -- 3. Create the Agency (WITH MANDATORY COLUMNS ALIGNMENT)
    BEGIN
        INSERT INTO public.agencies (
            name, 
            commercial_register, 
            phone, 
            email, 
            city, 
            address, 
            logo_url, 
            is_accredited, 
            accreditation_number, 
            status,
            subscription_status, -- MANDATORY
            plan_type,           -- MANDATORY
            monthly_fee          -- MANDATORY
        ) VALUES (
            v_request.agency_name, 
            v_request.commercial_register, 
            v_request.phone, 
            v_request.director_email, 
            v_request.city, 
            v_request.address,
            v_request.logo_url, 
            v_request.is_accredited, 
            v_request.accreditation_number, 
            'active',
            'trial',             -- Default for new agencies
            v_plan,              -- From request
            v_price              -- From plan pricing
        ) RETURNING id INTO v_agency_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Error creating agency: ' || SQLERRM);
    END;

    -- 4. Create separate subscription entry (keeping legacy sync)
    INSERT INTO public.agency_subscriptions (
        agency_id, plan_type, status, monthly_fee, 
        start_date, next_payment_date, trial_days_remaining
    ) VALUES (
        v_agency_id, v_plan, 'trial', v_price,
        CURRENT_DATE, v_next_payment_date, 60
    );

    -- 5. Link Director to Agency
    INSERT INTO public.agency_users (user_id, agency_id, role)
    VALUES (v_request.director_auth_user_id, v_agency_id, 'director');

    -- 6. Update Platform Admin if not already there
    INSERT INTO public.platform_admins (user_id, role)
    VALUES (v_request.director_auth_user_id, 'super_admin')
    ON CONFLICT (user_id) DO NOTHING;

    -- 7. Mark request as processed
    UPDATE public.agency_registration_requests 
    SET status = 'approved', 
        processed_at = now() 
    WHERE id = p_request_id;

    RETURN json_build_object(
        'success', true, 
        'agency_id', v_agency_id,
        'message', 'TRANSITION_OK'
    );
END;
$$;
