-- Migration: Add KYC and Structure Type columns
-- Created: 2026-07-08

ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS id_card_url TEXT;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS structure_type TEXT DEFAULT 'agency';

ALTER TABLE public.agency_registration_requests ADD COLUMN IF NOT EXISTS id_card_url TEXT;
ALTER TABLE public.agency_registration_requests ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE public.agency_registration_requests ADD COLUMN IF NOT EXISTS structure_type TEXT DEFAULT 'agency';

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
        logo_url, is_accredited, accreditation_number, status,
        id_card_url, profile_photo_url, structure_type
    ) VALUES (
        v_request.agency_name, v_request.commercial_register, 
        v_request.phone, v_request.director_email, v_request.city, v_request.address,
        v_request.logo_url, v_request.is_accredited, v_request.accreditation_number, 'active',
        v_request.id_card_url, v_request.profile_photo_url, v_request.structure_type
    ) RETURNING id INTO v_agency_id;

    -- 3. Associer le directeur à l'agence dans la table public.users
    UPDATE public.users 
    SET agency_id = v_agency_id,
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
        v_agency_id, 
        v_plan::public.plan_type, 
        'trial'::public.subscription_status, 
        v_price,
        CURRENT_DATE, 
        v_next_payment_date, 
        60
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

ALTER FUNCTION public.approve_agency_request(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.approve_agency_request(uuid) TO authenticated;

-- 4. Recréer les vues pour exposer commercial_register et structure_type de manière sécurisée
DROP VIEW IF EXISTS public.collaboration_ads_with_agency;
DROP VIEW IF EXISTS public.agencies_public_info;
DROP VIEW IF EXISTS private.agencies_public_info;

CREATE OR REPLACE VIEW private.agencies_public_info 
WITH (security_barrier)
AS
SELECT id, name, logo_url, commercial_register, structure_type
FROM public.agencies;

ALTER VIEW private.agencies_public_info OWNER TO postgres;
GRANT SELECT ON private.agencies_public_info TO authenticated;
GRANT SELECT ON private.agencies_public_info TO anon;

CREATE OR REPLACE VIEW public.agencies_public_info 
WITH (security_invoker = true) 
AS
SELECT * FROM private.agencies_public_info;

ALTER VIEW public.agencies_public_info OWNER TO postgres;
REVOKE ALL ON public.agencies_public_info FROM public;
GRANT SELECT ON public.agencies_public_info TO authenticated;
GRANT SELECT ON public.agencies_public_info TO anon;

CREATE OR REPLACE VIEW public.collaboration_ads_with_agency 
WITH (security_invoker = true) 
AS
SELECT 
  ca.*,
  a.name AS agency_name,
  a.logo_url AS agency_logo_url,
  a.commercial_register AS agency_commercial_register,
  a.structure_type AS agency_structure_type
FROM public.collaboration_ads ca
LEFT JOIN public.agencies_public_info a ON ca.agency_id = a.id;

REVOKE ALL ON public.collaboration_ads_with_agency FROM public;
GRANT SELECT ON public.collaboration_ads_with_agency TO authenticated;
GRANT SELECT ON public.collaboration_ads_with_agency TO anon;

SELECT '✅ Migration et mise à jour de la vue terminées' as status;
