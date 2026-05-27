-- ==============================================================================
-- GESTION360 - AUDIT DE L'INTÉGRITÉ DES UTILISATEURS & RÉPARATION DU PONTAGE
-- ==============================================================================
-- Ce script permet de diagnostiquer et réparer automatiquement tous les
-- comptes utilisateurs orphelins (bloqués entre auth.users et public.users)
-- ou non associés à une agence.
-- ==============================================================================

DO $$
DECLARE
    r_orphan RECORD;
    v_agency_id UUID;
    v_repair_count INT := 0;
BEGIN
    RAISE NOTICE '=== 🔍 DÉBUT DE L''AUDIT D''INTÉGRITÉ DES COMPTES ===';

    -- 1. IDENTIFIER LES PROFILES PUBLICS MANQUANTS (Utilisateurs dans auth mais pas dans public)
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE '1. Recherche des utilisateurs existants dans auth.users mais absents de public.users...';
    
    FOR r_orphan IN 
        SELECT au.id, au.email, 
               COALESCE(au.raw_user_meta_data->>'first_name', 'Utilisateur') as first_name,
               COALESCE(au.raw_user_meta_data->>'last_name', 'Gestion360') as last_name,
               COALESCE(au.raw_user_meta_data->>'role', 'user') as role
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        RAISE NOTICE '⚠️ Compte orphelin trouvé : % (Email: %, ID: %)', 
            r_orphan.first_name || ' ' || r_orphan.last_name, r_orphan.email, r_orphan.id;
        
        -- Autoguérison : Recréer le profil public
        INSERT INTO public.users (id, email, first_name, last_name, is_active, permissions, created_at, updated_at)
        VALUES (
            r_orphan.id,
            r_orphan.email,
            r_orphan.first_name,
            r_orphan.last_name,
            true,
            CASE 
                -- Si c'est un administrateur plateforme
                WHEN r_orphan.email ILIKE '%admin%' OR r_orphan.role = 'admin' THEN
                    '{"dashboard": true, "properties": true, "owners": true, "tenants": true, "contracts": true, "collaboration": true, "caisse": true, "reports": true, "notifications": true, "settings": true, "userManagement": true}'::jsonb
                -- Si c'est un manager / chef d'agence
                ELSE
                    '{"dashboard": true, "properties": true, "owners": true, "tenants": true, "contracts": true, "collaboration": true, "caisse": true, "reports": true, "notifications": true, "settings": false, "userManagement": false}'::jsonb
            END,
            now(),
            now()
        )
        ON CONFLICT (id) DO NOTHING;
        
        v_repair_count := v_repair_count + 1;
        RAISE NOTICE '   ✅ Profil public créé avec succès pour %', r_orphan.email;
    END LOOP;

    -- 2. IDENTIFIER LES UTILISATEURS SANS LIEN D'AGENCE (Hors Administrateurs Plateforme)
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE '2. Recherche des utilisateurs non liés à une agence...';
    
    FOR r_orphan IN
        SELECT pu.id, pu.email, pu.first_name, pu.last_name
        FROM public.users pu
        LEFT JOIN public.agency_users au ON pu.id = au.user_id
        LEFT JOIN public.platform_admins pa ON pu.id = pa.user_id
        WHERE au.user_id IS NULL AND pa.user_id IS NULL
    LOOP
        RAISE NOTICE '⚠️ Utilisateur sans agence : % % (Email: %)', 
            r_orphan.first_name, r_orphan.last_name, r_orphan.email;

        -- Essayer d'associer automatiquement à une agence de repli si l'email donne un indice
        -- Par exemple, associer les adresses @gicosarl.net à l'agence GICO
        IF r_orphan.email ILIKE '%gicosarl%' THEN
            SELECT id INTO v_agency_id FROM public.agencies WHERE name ILIKE '%GICO%' LIMIT 1;
            
            IF v_agency_id IS NOT NULL THEN
                INSERT INTO public.agency_users (user_id, agency_id, role, created_at)
                VALUES (r_orphan.id, v_agency_id, 'manager', now())
                ON CONFLICT (user_id, agency_id) DO NOTHING;
                RAISE NOTICE '   ✅ Lié automatiquement à l''agence GICO en tant que Manager.';
            END IF;
        ELSE
            -- Sinon, associer à la première agence disponible comme "agent" pour éviter l'erreur d'accès
            SELECT id INTO v_agency_id FROM public.agencies LIMIT 1;
            IF v_agency_id IS NOT NULL THEN
                INSERT INTO public.agency_users (user_id, agency_id, role, created_at)
                VALUES (r_orphan.id, v_agency_id, 'agent', now())
                ON CONFLICT (user_id, agency_id) DO NOTHING;
                RAISE NOTICE '   ✅ Lié par défaut à l''agence % en tant qu''Agent.', 
                    (SELECT name FROM public.agencies WHERE id = v_agency_id);
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE '=== 📊 BILAN DE L''AUDIT ===';
    RAISE NOTICE 'Nombre de comptes réparés : %', v_repair_count;
    RAISE NOTICE '=== 🏁 FIN DE L''AUDIT D''INTÉGRITÉ ===';

END $$;

-- 3. AFFICHAGE DES RÉSULTATS D'AUDIT COMPLETS POUR VÉRIFICATION
SELECT 
    'public.users' AS table_name,
    pu.id AS user_id, 
    pu.email, 
    pu.first_name, 
    pu.last_name, 
    pu.is_active,
    COALESCE(au.role, 'PLATFORM_ADMIN / INDÉFINI') AS role_agence,
    COALESCE(a.name, 'AUCUNE AGENCE (ADMIN PLATEFORME)') AS nom_agence
FROM public.users pu
LEFT JOIN public.agency_users au ON pu.id = au.user_id
LEFT JOIN public.agencies a ON au.agency_id = a.id
ORDER BY nom_agence, role_agence;
