-- ==============================================================================
-- GESTION360 - AUDIT DE L'INTÉGRITÉ DES UTILISATEURS & RÉPARATION (VERSION FINALE)
-- ==============================================================================
-- Ce script :
-- 1. Nettoie les fausses liaisons d'agence pour les propriétaires, locataires ou démos.
-- 2. Crée automatiquement les profils public.users manquants.
-- 3. Associe UNIQUEMENT le personnel d'agence manquant à une agence.
-- ==============================================================================

DO $$
DECLARE
    r_orphan RECORD;
    v_agency_id UUID;
    v_repair_count INT := 0;
    v_clean_count INT := 0;
BEGIN
    RAISE NOTICE '=== 🔍 DÉBUT DE L''AUDIT D''INTÉGRITÉ DES COMPTES ===';

    -- 0. NETTOYAGE DES LIAISONS ERRONEES (Propriétaires, Locataires, Démo Proprio)
    -- Ces comptes n'appartiennent pas au personnel de l'agence.
    CREATE TEMP TABLE temp_to_clean AS
    SELECT DISTINCT pu.id, pu.email
    FROM public.users pu
    JOIN public.agency_users au ON pu.id = au.user_id
    WHERE (
        pu.id IN (SELECT DISTINCT o.user_id FROM public.owners o WHERE o.user_id IS NOT NULL)
        OR pu.id IN (SELECT DISTINCT t.user_id FROM public.tenants t WHERE t.user_id IS NOT NULL)
        OR pu.email ILIKE '%proprio%' 
        OR pu.email ILIKE '%locataire%'
        OR pu.email = 'maurel.agohi@gmail.com' -- Email test de démo propriétaire
        OR pu.email = 'momofilipo@yahoo.fr'
        OR pu.email = 'momofilipo@live.fr'
    )
    -- Ne pas nettoyer les directeurs d'agence légitimes
    AND au.role <> 'director';

    SELECT COUNT(*) INTO v_clean_count FROM temp_to_clean;
    
    IF v_clean_count > 0 THEN
        DELETE FROM public.agency_users 
        WHERE user_id IN (SELECT id FROM temp_to_clean);
        RAISE NOTICE '🧹 NETTOYAGE : % fausses liaisons de propriétaires/locataires retirées de public.agency_users.', v_clean_count;
    END IF;

    DROP TABLE IF EXISTS temp_to_clean;

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

    -- 2. IDENTIFIER LES COMPTES D'AGENCE SANS LIEN D'AGENCE (UNIQUEMENT LE PERSONNEL D'AGENCE)
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE '2. Recherche du personnel d''agence non lié à son agence...';
    
    FOR r_orphan IN
        SELECT pu.id, pu.email, pu.first_name, pu.last_name
        FROM public.users pu
        LEFT JOIN public.agency_users au ON pu.id = au.user_id
        LEFT JOIN public.platform_admins pa ON pu.id = pa.user_id
        WHERE au.user_id IS NULL 
          AND pa.user_id IS NULL
          -- EXCLURE les propriétaires et locataires de la table agency_users
          AND pu.id NOT IN (SELECT DISTINCT o.user_id FROM public.owners o WHERE o.user_id IS NOT NULL)
          AND pu.id NOT IN (SELECT DISTINCT t.user_id FROM public.tenants t WHERE t.user_id IS NOT NULL)
          AND pu.email NOT ILIKE '%proprio%'
          AND pu.email NOT ILIKE '%locataire%'
          AND pu.email NOT IN ('maurel.agohi@gmail.com', 'momofilipo@yahoo.fr', 'momofilipo@live.fr')
    LOOP
        RAISE NOTICE '⚠️ Personnel d''agence sans agence : % % (Email: %)', 
            r_orphan.first_name, r_orphan.last_name, r_orphan.email;

        -- Essayer d'associer automatiquement à une agence de repli si l'email donne un indice
        IF r_orphan.email ILIKE '%gicosarl%' THEN
            SELECT id INTO v_agency_id FROM public.agencies WHERE name ILIKE '%GICO%' LIMIT 1;
            
            IF v_agency_id IS NOT NULL THEN
                INSERT INTO public.agency_users (user_id, agency_id, role, created_at)
                VALUES (r_orphan.id, v_agency_id, 'manager', now())
                ON CONFLICT (user_id, agency_id) DO NOTHING;
                RAISE NOTICE '   ✅ Lié automatiquement à l''agence GICO en tant que Manager.';
            END IF;
        ELSE
            -- Sinon, associer à la première agence disponible comme "agent"
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
