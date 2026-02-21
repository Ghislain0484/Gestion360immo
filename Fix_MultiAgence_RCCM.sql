-- =============================================================================
-- GESTION360 : Permettre plusieurs agences par entreprise (meme RCCM)
-- Logique : UNIQUE(commercial_register, city) au lieu de UNIQUE(commercial_register)
-- Executer dans : Supabase --> SQL Editor
-- =============================================================================

-- ETAPE 1 : Nettoyage donnees de test (agence doublon + remise en pending)
-- Supprimer la subscription liee (cascade devrait le faire, mais au cas ou)
DELETE FROM public.agency_subscriptions
WHERE agency_id = '4491d4f2-f3e3-47b4-baf5-558ed51f9b99';

-- Supprimer l agence test
DELETE FROM public.agencies
WHERE id = '4491d4f2-f3e3-47b4-baf5-558ed51f9b99';

-- Remettre la demande en pending
UPDATE public.agency_registration_requests
SET status = 'pending', processed_by = NULL, processed_at = NULL
WHERE agency_name = 'GICO 8KILOS';

-- ETAPE 2 : Modifier la contrainte UNIQUE sur agencies
-- Supprimer l ancienne contrainte UNIQUE(commercial_register)
ALTER TABLE public.agencies
DROP CONSTRAINT IF EXISTS agencies_commercial_register_key;

-- Ajouter UNIQUE(commercial_register, city) = meme RCCM accepte dans villes differentes
ALTER TABLE public.agencies
ADD CONSTRAINT agencies_rccm_city_unique UNIQUE (commercial_register, city);

-- ETAPE 3 : Modifier la contrainte sur agency_registration_requests si elle existe
ALTER TABLE public.agency_registration_requests
DROP CONSTRAINT IF EXISTS agency_registration_requests_commercial_register_key;

-- ETAPE 4 : Mettre a jour la RPC approve_agency_request
-- La verification doublon passe de RCCM seul a RCCM+CITY+NAME
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
            'detail', 'Role: ' || COALESCE(v_admin_role, 'aucun')
        );
    END IF;

    SELECT * INTO v_req FROM public.agency_registration_requests WHERE id = p_request_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Demande introuvable'); END IF;
    IF v_req.status = 'approved' THEN RETURN jsonb_build_object('error', 'Deja approuvee'); END IF;

    -- Verification doublon : meme RCCM + meme ville + meme nom = vrai doublon
    SELECT id INTO v_existing_id FROM public.agencies
    WHERE commercial_register = v_req.commercial_register
      AND city = v_req.city
      AND name = v_req.agency_name;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'error', 'Cette agence existe deja dans la meme ville avec ce RCCM',
            'existing_agency_id', v_existing_id::TEXT
        );
    END IF;

    -- Creation agence
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
        RETURN jsonb_build_object('error', 'Echec creation agence: ' || SQLERRM, 'detail', SQLSTATE);
    END;

    -- Directeur
    IF v_req.director_auth_user_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.agency_users (user_id, agency_id, role)
            VALUES (v_req.director_auth_user_id, v_agency_id, 'director')
            ON CONFLICT (user_id, agency_id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN RAISE WARNING 'agency_users: %', SQLERRM; END;
    END IF;

    -- Abonnement trial
    BEGIN
        INSERT INTO public.agency_subscriptions (
            agency_id, plan_type, status, monthly_fee,
            start_date, next_payment_date, trial_days_remaining
        ) VALUES (v_agency_id, 'basic', 'trial', 25000, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 30);
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'subscriptions: %', SQLERRM; END;

    -- Marquer comme approuvee (processed_by = NULL si admin pas dans public.users)
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

GRANT EXECUTE ON FUNCTION public.approve_agency_request(UUID) TO authenticated;

-- Verification
SELECT name, commercial_register, city FROM public.agencies ORDER BY created_at DESC LIMIT 5;
SELECT 'Terminé avec succes' AS status;
