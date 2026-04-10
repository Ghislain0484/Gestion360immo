-- =============================================================================
-- GESTION360 - RÉSOLUTION ACCÈS ÉQUIPE GICO 8 KILOS (VERSION CORRIGÉE)
-- Cibles : 
--   1. giselealla@gicosarl.net   -> Manager / Chef d'agence
--   2. fortuneamona@gicosarl.net -> Caissière
-- =============================================================================

DO $$
DECLARE
    v_agency_id UUID;
    v_user_fortune_id UUID;
    v_user_gisele_id UUID;
BEGIN
    -- 1. Récupération de l'ID de l'agence GICO 8 KILOS
    SELECT id INTO v_agency_id FROM public.agencies WHERE name ILIKE '%GICO%8%kilos%' OR name ILIKE '%GICO%8%kg%';
    
    IF v_agency_id IS NULL THEN
        -- Tentative de repli
        SELECT id INTO v_agency_id FROM public.agencies WHERE name ILIKE '%GICO%' LIMIT 1;
    END IF;

    IF v_agency_id IS NULL THEN
        RAISE NOTICE '❌ Agence GICO non trouvée dans public.agencies.';
    ELSE
        RAISE NOTICE '✅ Agence GICO identifiée : % (ID: %)', (SELECT name FROM public.agencies WHERE id = v_agency_id), v_agency_id;

        -- 2. Configuration de Gisele Alla (Manager / Chef d'agence)
        SELECT id INTO v_user_gisele_id FROM public.users WHERE LOWER(email) = 'giselealla@gicosarl.net';
        
        IF v_user_gisele_id IS NOT NULL THEN
            -- Liaison agence
            INSERT INTO public.agency_users (user_id, agency_id, role, created_at)
            VALUES (v_user_gisele_id, v_agency_id, 'manager', now())
            ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'manager', updated_at = now();

            -- Permissions Manager (Accès total sauf réglages système)
            UPDATE public.users SET permissions = '{
                "dashboard": true, "properties": true, "owners": true, "tenants": true, 
                "contracts": true, "collaboration": true, "caisse": true, "reports": true, 
                "notifications": true, "settings": false, "userManagement": false
            }'::jsonb, is_active = true WHERE id = v_user_gisele_id;
            
            RAISE NOTICE '✅ Gisele Alla configurée comme Manager / Chef d''agence.';
        ELSE
            RAISE NOTICE '⚠️ Utilisateur giselealla@gicosarl.net non trouvé.';
        END IF;

        -- 3. Configuration de Fortune Amona (Caissière)
        SELECT id INTO v_user_fortune_id FROM public.users WHERE LOWER(email) = 'fortuneamona@gicosarl.net';
        
        IF v_user_fortune_id IS NOT NULL THEN
            -- Liaison agence
            INSERT INTO public.agency_users (user_id, agency_id, role, created_at)
            VALUES (v_user_fortune_id, v_agency_id, 'cashier', now())
            ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'cashier', updated_at = now();

            -- Permissions Cashier (Limité à la Caisse et rapports)
            UPDATE public.users SET permissions = '{
                "dashboard": true, "properties": false, "owners": false, "tenants": false, 
                "contracts": false, "collaboration": false, "caisse": true, "reports": true, 
                "notifications": true, "settings": false, "userManagement": false
            }'::jsonb, is_active = true WHERE id = v_user_fortune_id;
            
            RAISE NOTICE '✅ Fortune Amona configurée comme Caissière.';
        ELSE
            RAISE NOTICE '⚠️ Utilisateur fortuneamona@gicosarl.net non trouvé.';
        END IF;
    END IF;

END $$;

-- 4. Vérification
SELECT 
    u.email, 
    u.first_name, 
    u.last_name, 
    au.role, 
    a.name as agency_name,
    u.permissions->>'caisse' as access_caisse,
    u.permissions->>'dashboard' as access_dashboard
FROM public.users u
JOIN public.agency_users au ON u.id = au.user_id
JOIN public.agencies a ON au.agency_id = a.id
WHERE LOWER(u.email) IN ('fortuneamona@gicosarl.net', 'giselealla@gicosarl.net');
