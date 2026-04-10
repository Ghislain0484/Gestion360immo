-- =============================================================================
-- GESTION360 - RÉSOLUTION ACCÈS CHEF D'AGENCE (GICO 8 KILOS)
-- Cible : fortuneamona@gicosarl.net
-- =============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_agency_id UUID;
BEGIN
    -- 1. Récupération de l'ID de l'utilisateur
    SELECT id INTO v_user_id FROM public.users WHERE LOWER(email) = 'fortuneamona@gicosarl.net';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '⚠️ Utilisateur fortuneamona@gicosarl.net non trouvé dans public.users';
    ELSE
        -- 2. Récupération de l'ID de l'agence GICO 8 KILOS
        SELECT id INTO v_agency_id FROM public.agencies WHERE name ILIKE '%GICO%8%kilos%' OR name ILIKE '%GICO%8%kg%';
        
        IF v_agency_id IS NULL THEN
            -- Tentative de repli sur GICO SARL si 8 kilos n'est pas trouvé précisément
            SELECT id INTO v_agency_id FROM public.agencies WHERE name ILIKE '%GICO%' LIMIT 1;
        END IF;

        IF v_agency_id IS NULL THEN
            RAISE NOTICE '❌ Agence GICO 8 kilos non trouvée dans la base.';
        ELSE
            RAISE NOTICE '✅ Agence trouvée : % (ID: %)', (SELECT name FROM public.agencies WHERE id = v_agency_id), v_agency_id;

            -- 3. Mise à jour ou Liaison de l'utilisateur à l'agence avec le rôle 'manager' (Chef d'agence)
            INSERT INTO public.agency_users (user_id, agency_id, role, created_at)
            VALUES (v_user_id, v_agency_id, 'manager', now())
            ON CONFLICT (user_id, agency_id) 
            DO UPDATE SET role = 'manager', updated_at = now();

            -- 4. Attribution des permissions complètes de Chef d'Agence dans public.users
            UPDATE public.users 
            SET permissions = '{
                "dashboard": true,
                "properties": true,
                "owners": true,
                "tenants": true,
                "contracts": true,
                "collaboration": true,
                "caisse": true,
                "reports": true,
                "notifications": true,
                "settings": false,
                "userManagement": false
            }'::jsonb,
            is_active = true,
            updated_at = now()
            WHERE id = v_user_id;

            RAISE NOTICE '✅ Utilisateur fortuneamona@gicosarl.net configuré comme Chef d''agence (manager) pour GICO.';
        END IF;
    END IF;
END $$;

-- 5. Vérification finale
SELECT 
    u.email, 
    u.first_name, 
    u.last_name, 
    au.role, 
    a.name as agency_name,
    u.permissions->>'caisse' as has_caisse_access
FROM public.users u
JOIN public.agency_users au ON u.id = au.user_id
JOIN public.agencies a ON au.agency_id = a.id
WHERE LOWER(u.email) = 'fortuneamona@gicosarl.net';
