-- ==============================================================================
-- FIX DES PERMISSIONS DU DIRECTEUR
-- ==============================================================================

-- Le bug provenait du fait que la colonne "director_id" de la table "agencies" 
-- était vide pour les nouvelles agences, ce qui cassait les droits de lecture
-- sur le personnel (Chef d'agence, etc.).

UPDATE public.agencies a
SET director_id = u.user_id
FROM public.agency_users u
WHERE u.agency_id = a.id AND u.role = 'director' AND a.director_id IS NULL;

-- Et pour corriger la fonction d'approbation pour l'avenir :
CREATE OR REPLACE FUNCTION public.approve_agency_request(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
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
    SELECT * INTO v_request FROM public.agency_registration_requests WHERE id = p_request_id AND status = 'pending';
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Demande non trouvée'); END IF;

    v_plan := COALESCE(v_request.selected_plan, 'basic');
    v_billing_cycle := COALESCE(v_request.billing_cycle, 'monthly');
    v_price := CASE WHEN v_plan = 'basic' THEN 25000 WHEN v_plan = 'premium' THEN 50000 WHEN v_plan = 'enterprise' THEN 100000 ELSE 25000 END;
    IF v_billing_cycle = 'yearly' THEN v_price := (v_price * 0.8)::INTEGER; END IF;

    -- Ajout de "director_id" lors de la création
    INSERT INTO public.agencies (
        name, commercial_register, phone, email, city, address, 
        logo_url, is_accredited, accreditation_number, status, director_id
    ) VALUES (
        v_request.agency_name, v_request.commercial_register, 
        v_request.phone, v_request.director_email, v_request.city, v_request.address,
        v_request.logo_url, v_request.is_accredited, v_request.accreditation_number, 'active',
        v_request.director_auth_user_id
    ) RETURNING id INTO v_agency_id;

    UPDATE public.users SET agency_id = v_agency_id, is_active = true WHERE id = v_request.director_auth_user_id;

    INSERT INTO public.agency_users (agency_id, user_id, role)
    VALUES (v_agency_id, v_request.director_auth_user_id, 'director')
    ON CONFLICT (agency_id, user_id) DO NOTHING;

    v_next_payment_date := CURRENT_DATE + INTERVAL '60 days';

    INSERT INTO public.agency_subscriptions (agency_id, plan_type, status, monthly_fee, start_date, next_payment_date, trial_days_remaining) 
    VALUES (v_agency_id, v_plan::public.plan_type, 'trial'::public.subscription_status, v_price, CURRENT_DATE, v_next_payment_date, 60);

    UPDATE public.agency_registration_requests SET status = 'approved', processed_at = now() WHERE id = p_request_id;

    RETURN json_build_object('success', true, 'agency_id', v_agency_id, 'user_id', v_request.director_auth_user_id, 'plan', v_plan);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

ALTER FUNCTION public.approve_agency_request(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.approve_agency_request(uuid) TO authenticated;

SELECT '✅ Droits du directeur restaurés.' as status;
