-- Ajout de colonnes pour stocker le plan choisi lors de l'inscription
ALTER TABLE public.agency_registration_requests
ADD COLUMN IF NOT EXISTS selected_plan TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT;

-- Mise à jour de la RPC approve_agency_request pour prendre en compte ces choix
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
    -- 1. Récupérer les données de la demande
    SELECT * INTO v_request 
    FROM public.agency_registration_requests 
    WHERE id = p_request_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Demande non trouvée ou déjà traitée');
    END IF;

    -- Déterminer le plan et le cycle (fallback si non renseigné)
    v_plan := COALESCE(v_request.selected_plan, 'basic');
    v_billing_cycle := COALESCE(v_request.billing_cycle, 'monthly');

    -- Calculer le prix
    v_price := CASE 
        WHEN v_plan = 'basic' THEN 25000
        WHEN v_plan = 'premium' THEN 50000
        WHEN v_plan = 'enterprise' THEN 100000
        ELSE 25000
    END;

    -- Appliquer la réduction annuelle si nécessaire
    IF v_billing_cycle = 'yearly' THEN
        v_price := (v_price * 0.8)::INTEGER;
    END IF;

    -- 2. Créer l'agence
    INSERT INTO public.agencies (
        name, commercial_register, phone, email, city, address, 
        logo_url, is_accredited, accreditation_number, status
    ) VALUES (
        v_request.agency_name, v_request.commercial_register, 
        v_request.phone, v_request.director_email, v_request.city, v_request.address,
        v_request.logo_url, v_request.is_accredited, v_request.accreditation_number, 'active'
    ) RETURNING id INTO v_agency_id;

    -- 3. Associer le directeur à l'agence dans la table public.users
    -- On s'assure que l'utilisateur existe (il est créé par auth.signUp lors de l'inscription)
    UPDATE public.users 
    SET agency_id = v_agency_id,
        role = 'director',
        is_active = true
    WHERE id = v_request.director_auth_user_id;

    -- 3bis. Ajouter également l'utilisateur dans la table agency_users
    INSERT INTO public.agency_users (
        agency_id,
        user_id,
        role
    ) VALUES (
        v_agency_id,
        v_request.director_auth_user_id,
        'director'
    ) ON CONFLICT (agency_id, user_id) DO NOTHING;

    -- 4. Créer l'abonnement (avec 60 jours d'essai offerts)
    v_next_payment_date := CURRENT_DATE + INTERVAL '60 days';

    INSERT INTO public.agency_subscriptions (
        agency_id, plan_type, status, monthly_fee, 
        start_date, next_payment_date, trial_days_remaining
    ) VALUES (
        v_agency_id, v_plan, 'trial', v_price,
        CURRENT_DATE, v_next_payment_date, 60
    );

    -- 5. Marquer la demande comme approuvée
    UPDATE public.agency_registration_requests
    SET status = 'approved',
        processed_at = now()
    WHERE id = p_request_id;

    RETURN json_build_object(
        'success', true, 
        'agency_id', v_agency_id,
        'user_id', v_request.director_auth_user_id,
        'plan', v_plan
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;
