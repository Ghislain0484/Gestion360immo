-- ==============================================================================
-- GESTION360 - RÉPARATION ET PONTAGE DE L'ACCÈS POUR L'ÉQUIPE GICO
-- Cibles : 
--   1. giselealla@gicosarl.net   -> Manager (Chef d'agence)
--   2. fortuneamona@gicosarl.net -> Cashier (Caissière)
-- ==============================================================================

DO $$
DECLARE
    v_agency_id UUID;
    v_gisele_uid UUID;
    v_fortune_uid UUID;
BEGIN
    -- 1. Identifier l'ID de l'agence GICO (GICO 8 KILOS ou alternative)
    SELECT id INTO v_agency_id 
    FROM public.agencies 
    WHERE name ILIKE '%GICO%8%kilos%' OR name ILIKE '%GICO%8%kg%';
    
    IF v_agency_id IS NULL THEN
        SELECT id INTO v_agency_id FROM public.agencies WHERE name ILIKE '%GICO%' LIMIT 1;
    END IF;

    IF v_agency_id IS NULL THEN
        RAISE EXCEPTION '❌ Erreur critique : Agence GICO introuvable dans la table public.agencies !';
    ELSE
        RAISE NOTICE '✅ Agence GICO trouvée : (ID: %)', v_agency_id;
    END IF;

    -- ==========================================================================
    -- RÉPARATION GISELE ALLA (giselealla@gicosarl.net)
    -- ==========================================================================
    -- Récupération de son ID authentifié
    SELECT id INTO v_gisele_uid FROM auth.users WHERE LOWER(email) = 'giselealla@gicosarl.net';

    IF v_gisele_uid IS NULL THEN
        RAISE NOTICE '⚠️ Avertissement : giselealla@gicosarl.net non trouvée dans auth.users. L''administrateur doit d''abord créer son compte via le menu Authentification.';
    ELSE
        RAISE NOTICE '✅ ID Authentifié de Gisele trouvé : %', v_gisele_uid;

        -- Pontage vers public.users
        INSERT INTO public.users (id, email, first_name, last_name, is_active, permissions, created_at, updated_at)
        VALUES (
            v_gisele_uid,
            'giselealla@gicosarl.net',
            'Gisele',
            'Alla',
            true,
            '{
                "dashboard": true, "properties": true, "owners": true, "tenants": true, 
                "contracts": true, "collaboration": true, "caisse": true, "reports": true, 
                "notifications": true, "settings": false, "userManagement": false
            }'::jsonb,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = 'giselealla@gicosarl.net',
            first_name = COALESCE(public.users.first_name, 'Gisele'),
            last_name = COALESCE(public.users.last_name, 'Alla'),
            is_active = true,
            permissions = '{
                "dashboard": true, "properties": true, "owners": true, "tenants": true, 
                "contracts": true, "collaboration": true, "caisse": true, "reports": true, 
                "notifications": true, "settings": false, "userManagement": false
            }'::jsonb,
            updated_at = now();

        -- Liaison agence (Manager)
        INSERT INTO public.agency_users (user_id, agency_id, role, created_at)
        VALUES (v_gisele_uid, v_agency_id, 'manager', now())
        ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'manager', updated_at = now();

        RAISE NOTICE '✅ Gisele Alla réparée, activée et liée comme Manager.';
    END IF;

    -- ==========================================================================
    -- RÉPARATION FORTUNE AMONA (fortuneamona@gicosarl.net)
    -- ==========================================================================
    -- Récupération de son ID authentifié
    SELECT id INTO v_fortune_uid FROM auth.users WHERE LOWER(email) = 'fortuneamona@gicosarl.net';

    IF v_fortune_uid IS NULL THEN
        RAISE NOTICE '⚠️ Avertissement : fortuneamona@gicosarl.net non trouvée dans auth.users.';
    ELSE
        RAISE NOTICE '✅ ID Authentifié de Fortune trouvé : %', v_fortune_uid;

        -- Pontage vers public.users
        INSERT INTO public.users (id, email, first_name, last_name, is_active, permissions, created_at, updated_at)
        VALUES (
            v_fortune_uid,
            'fortuneamona@gicosarl.net',
            'Fortune',
            'Amona',
            true,
            '{
                "dashboard": true, "properties": false, "owners": false, "tenants": false, 
                "contracts": false, "collaboration": false, "caisse": true, "reports": true, 
                "notifications": true, "settings": false, "userManagement": false
            }'::jsonb,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = 'fortuneamona@gicosarl.net',
            first_name = COALESCE(public.users.first_name, 'Fortune'),
            last_name = COALESCE(public.users.last_name, 'Amona'),
            is_active = true,
            permissions = '{
                "dashboard": true, "properties": false, "owners": false, "tenants": false, 
                "contracts": false, "collaboration": false, "caisse": true, "reports": true, 
                "notifications": true, "settings": false, "userManagement": false
            }'::jsonb,
            updated_at = now();

        -- Liaison agence (Caissière)
        INSERT INTO public.agency_users (user_id, agency_id, role, created_at)
        VALUES (v_fortune_uid, v_agency_id, 'cashier', now())
        ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'cashier', updated_at = now();

        RAISE NOTICE '✅ Fortune Amona réparée, activée et liée comme Caissière.';
    END IF;

END $$;

-- Renvoyer un rapport de vérification
SELECT 
    u.email, 
    u.first_name, 
    u.last_name, 
    u.is_active,
    au.role, 
    a.name AS nom_agence,
    u.permissions->>'caisse' AS acces_caisse,
    u.permissions->>'dashboard' AS acces_dashboard
FROM public.users u
JOIN public.agency_users au ON u.id = au.user_id
JOIN public.agencies a ON au.agency_id = a.id
WHERE LOWER(u.email) IN ('giselealla@gicosarl.net', 'fortuneamona@gicosarl.net');
