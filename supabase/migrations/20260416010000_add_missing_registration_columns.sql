-- Migration to add missing columns to agency_registration_requests and update approval logic
-- Resolves PGRST204: Could not find the 'billing_cycle' column

-- 1. Add missing columns to help track plan choice
ALTER TABLE public.agency_registration_requests
ADD COLUMN IF NOT EXISTS selected_plan TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT;

-- 2. Update the approval RPC to handle these new fields and automate setup
DROP FUNCTION IF EXISTS public.approve_agency_request(uuid);

CREATE OR REPLACE FUNCTION public.approve_agency_request(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_request record;
    v_agency_id uuid;
    v_user_id uuid;
    v_plan TEXT;
    v_price INTEGER;
    v_billing_cycle TEXT;
    v_next_payment_date DATE;
BEGIN
    -- 1. Get request data
    SELECT * INTO v_request 
    FROM public.agency_registration_requests 
    WHERE id = p_request_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Demande non trouvée ou déjà traitée');
    END IF;

    -- Use chosen plan or fallback to 'basic'
    v_plan := COALESCE(v_request.selected_plan, 'basic');
    v_billing_cycle := COALESCE(v_request.billing_cycle, 'monthly');

    -- Calculate price (standard defaults)
    v_price := CASE 
        WHEN v_plan = 'basic' THEN 25000
        WHEN v_plan = 'premium' THEN 50000
        WHEN v_plan = 'enterprise' THEN 100000
        ELSE 25000
    END;

    -- Apply yearly discount (20%)
    IF v_billing_cycle = 'yearly' THEN
        v_price := (v_price * 0.8)::INTEGER;
    END IF;

    -- 2. Create the Agency
    INSERT INTO public.agencies (
        name, commercial_register, phone, email, city, address, 
        logo_url, is_accredited, accreditation_number, status,
        director_id
    ) VALUES (
        v_request.agency_name, v_request.commercial_register, 
        v_request.phone, v_request.director_email, v_request.city, v_request.address,
        v_request.logo_url, v_request.is_accredited, v_request.accreditation_number, 'active',
        v_request.director_auth_user_id
    ) RETURNING id INTO v_agency_id;

    -- 3. Link Director to the newly created agency
    UPDATE public.users 
    SET agency_id = v_agency_id
    WHERE id = v_request.director_auth_user_id;
    
    -- Ensure entry in agency_users table
    INSERT INTO public.agency_users (user_id, agency_id, role)
    VALUES (v_request.director_auth_user_id, v_agency_id, 'director')
    ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'director';

    -- 4. Create the Subscription (with 60 days trial)
    v_next_payment_date := CURRENT_DATE + INTERVAL '60 days';

    INSERT INTO public.agency_subscriptions (
        agency_id, plan_type, status, monthly_fee, 
        start_date, next_payment_date, trial_days_remaining
    ) VALUES (
        v_agency_id, v_plan, 'trial', v_price,
        CURRENT_DATE, v_next_payment_date, 60
    );

    -- 5. Mark request as approved
    UPDATE public.agency_registration_requests
    SET status = 'approved',
        processed_at = now()
    WHERE id = p_request_id;

    RETURN json_build_object(
        'success', true, 
        'agency_id', v_agency_id,
        'plan', v_plan,
        'billing_cycle', v_billing_cycle
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;
