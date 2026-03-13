-- =============================================================================
-- GESTION360 - Update RPC for 2 months (60 days) free trial
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_agency_request(p_request_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id      UUID;
    v_admin_role   TEXT;
    v_req          RECORD;
    v_agency_id    UUID;
    v_existing_id  UUID;
    v_processed_by UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Non authentifie');
    END IF;

    SELECT role INTO v_admin_role FROM public.platform_admins
    WHERE user_id = v_user_id AND is_active = true;

    IF v_admin_role IS NULL OR v_admin_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object(
            'error', 'Permissions insuffisantes',
            'detail', 'Role: ' || COALESCE(v_admin_role, 'aucun'),
            'user_id', v_user_id::TEXT
        );
    END IF;

    SELECT * INTO v_req FROM public.agency_registration_requests WHERE id = p_request_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Demande introuvable'); END IF;
    IF v_req.status = 'approved' THEN RETURN jsonb_build_object('error', 'Deja approuvee'); END IF;

    SELECT id INTO v_existing_id FROM public.agencies WHERE commercial_register = v_req.commercial_register;
    IF FOUND THEN
        RETURN jsonb_build_object('error', 'RCCM deja utilise: ' || v_existing_id::TEXT);
    END IF;

    BEGIN
        INSERT INTO public.agencies (
            name, commercial_register, logo_url, is_accredited, accreditation_number,
            address, city, phone, email, status, director_id
        ) VALUES (
            v_req.agency_name, v_req.commercial_register, v_req.logo_url,
            COALESCE(v_req.is_accredited, false), v_req.accreditation_number,
            COALESCE(NULLIF(TRIM(v_req.address), ''), 'A completer'),
            COALESCE(NULLIF(TRIM(v_req.city), ''), 'A completer'),
            COALESCE(NULLIF(TRIM(v_req.phone), ''), '0000000000'),
            COALESCE(NULLIF(TRIM(v_req.director_email), ''), 'contact@agence.ci'),
            'approved', v_req.director_auth_user_id
        ) RETURNING id INTO v_agency_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', 'Echec agencies insert: ' || SQLERRM, 'detail', SQLSTATE);
    END;

    IF v_req.director_auth_user_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.agency_users (user_id, agency_id, role)
            VALUES (v_req.director_auth_user_id, v_agency_id, 'director')
            ON CONFLICT (user_id, agency_id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN RAISE WARNING 'agency_users: %', SQLERRM; END;
    END IF;

    BEGIN
        -- Updated to 60 days trial
        INSERT INTO public.agency_subscriptions (
            agency_id, plan_type, status, monthly_fee,
            start_date, next_payment_date, trial_days_remaining
        ) VALUES (v_agency_id, 'basic', 'trial', 25000, CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', 60);
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'agency_subscriptions: %', SQLERRM; END;

    -- processed_by : NULL si l admin n a pas de ligne dans public.users (evite FK error)
    SELECT CASE WHEN EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id)
                THEN v_user_id ELSE NULL END INTO v_processed_by;

    UPDATE public.agency_registration_requests
    SET status = 'approved', processed_by = v_processed_by, processed_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'agency_id', v_agency_id::TEXT);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE);
END;
$$;
