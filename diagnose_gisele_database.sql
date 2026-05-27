-- ==============================================================================
-- GESTION360 - DIAGNOSTIC ET LIQUIDATION DES BLOQUEURS DE GISELE ALLA
-- ==============================================================================
-- Ce script :
-- 1. Force la confirmation de son adresse email dans auth.users (bloqueur Supabase #1).
-- 2. Recrée son profil public dans public.users si manquant ou inactif.
-- 3. Lie son profil à l'agence GICO en tant que Manager.
-- 4. Affiche un bilan détaillé de son état de compte.
-- ==============================================================================

DO $$
DECLARE
    v_gisele_uid UUID;
    v_gisele_email TEXT := 'giselealla@gicosarl.net';
    v_agency_id UUID;
    v_repair_count INT := 0;
BEGIN
    RAISE NOTICE '=== 🔍 DÉBUT DU DIAGNOSTIC / RÉPARATION DE COMPTE ===';

    -- 1. Récupération de l'ID authentifié
    SELECT id INTO v_gisele_uid FROM auth.users WHERE LOWER(email) = LOWER(v_gisele_email);

    IF v_gisele_uid IS NULL THEN
        RAISE NOTICE '❌ ERREUR CRITIQUE : L''adresse email ''%'' n''existe pas dans auth.users.', v_gisele_email;
        RAISE NOTICE '👉 Action requise : L''administrateur doit obligatoirement créer ce compte dans l''onglet Authentication > Users de Supabase avant de pouvoir l''utiliser.';
    ELSE
        RAISE NOTICE '✅ Compte d''authentification trouvé. ID : %', v_gisele_uid;

        -- 2. FORCE LA CONFIRMATION DE L'EMAIL (Le bloqueur invisible le plus fréquent)
        -- Si l'email n'est pas marqué comme confirmé, Supabase bloque la connexion avec une erreur d'identifiants
        UPDATE auth.users
        SET 
            confirmed_at = COALESCE(confirmed_at, now()),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now(),
            banned_until = NULL, -- S'assurer qu'elle n'est pas bannie
            deleted_at = NULL    -- S'assurer qu'elle n'est pas marquée comme supprimée
        WHERE id = v_gisele_uid;
        
        RAISE NOTICE '   ✅ Statut de confirmation email forcé/vérifié avec succès.';

        -- 3. S'assurer de la présence du profil public actif
        INSERT INTO public.users (id, email, first_name, last_name, is_active, permissions, created_at, updated_at)
        VALUES (
            v_gisele_uid,
            v_gisele_email,
            'Gisele',
            'Alla',
            true,
            '{"dashboard": true, "properties": true, "owners": true, "tenants": true, "contracts": true, "collaboration": true, "caisse": true, "reports": true, "notifications": true, "settings": false, "userManagement": false}'::jsonb,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            is_active = true,
            email = v_gisele_email,
            first_name = COALESCE(public.users.first_name, 'Gisele'),
            last_name = COALESCE(public.users.last_name, 'Alla'),
            permissions = '{"dashboard": true, "properties": true, "owners": true, "tenants": true, "contracts": true, "collaboration": true, "caisse": true, "reports": true, "notifications": true, "settings": false, "userManagement": false}'::jsonb,
            updated_at = now();

        RAISE NOTICE '   ✅ Profil public.users forcé et activé.';

        -- 4. Récupérer l'ID de l'agence GICO
        SELECT id INTO v_agency_id FROM public.agencies WHERE name ILIKE '%GICO%' LIMIT 1;

        IF v_agency_id IS NULL THEN
            RAISE NOTICE '⚠️ Avertissement : Impossible de trouver une agence GICO dans public.agencies.';
        ELSE
            -- Associer à l'agence GICO en tant que Manager
            INSERT INTO public.agency_users (user_id, agency_id, role, created_at)
            VALUES (v_gisele_uid, v_agency_id, 'manager', now())
            ON CONFLICT (user_id, agency_id) DO UPDATE SET
                role = 'manager',
                updated_at = now();
            
            RAISE NOTICE '   ✅ Rattachée à l''agence ''%'' (ID: %) comme Manager.', 
                (SELECT name FROM public.agencies WHERE id = v_agency_id), v_agency_id;
        END IF;

    END IF;

    RAISE NOTICE '=== 🏁 FIN DU DIAGNOSTIC / RÉPARATION ===';
END $$;

-- 5. RAPPORT D'ÉTAT DÉTAILLÉ POUR VÉRIFICATION
SELECT 
    'auth.users' AS table_source,
    id AS user_uid,
    email,
    confirmed_at AS email_confirme_le,
    last_sign_in_at AS derniere_connexion,
    deleted_at AS date_suppression,
    banned_until AS banni_jusqua,
    NULL::text AS nom_complet,
    NULL::boolean AS compte_actif,
    NULL::text AS role_agence,
    NULL::text AS nom_agence
FROM auth.users 
WHERE LOWER(email) = 'giselealla@gicosarl.net'

UNION ALL

SELECT 
    'public.users / agence' AS table_source,
    pu.id AS user_uid,
    pu.email,
    NULL::timestamp with time zone AS email_confirme_le,
    NULL::timestamp with time zone AS derniere_connexion,
    NULL::timestamp with time zone AS date_suppression,
    NULL::timestamp with time zone AS banni_jusqua,
    pu.first_name || ' ' || pu.last_name AS nom_complet,
    pu.is_active AS compte_actif,
    COALESCE(au.role::text, 'PAS DE RÔLE') AS role_agence,
    COALESCE(a.name, 'PAS D''AGENCE') AS nom_agence
FROM public.users pu
LEFT JOIN public.agency_users au ON pu.id = au.user_id
LEFT JOIN public.agencies a ON au.agency_id = a.id
WHERE LOWER(pu.email) = 'giselealla@gicosarl.net';
