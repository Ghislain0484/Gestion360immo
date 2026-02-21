-- =============================================================
-- FIX FINAL (V2) : Synchronisation Multi-Agences
-- Résout l'erreur de contrainte "uq_agency_single_director"
-- =============================================================

DO $$
DECLARE
    v_user_id UUID := '7e1bb674-66ee-46f2-aec2-550231b660b0';
    v_agency_1 UUID;
    v_agency_2 UUID;
BEGIN
    -- 1. Récupérer les IDs par nom (ILike pour être flexible)
    SELECT id INTO v_agency_1 FROM public.agencies WHERE name ILIKE '%Général Immobilier et Conseils SARL%' LIMIT 1;
    SELECT id INTO v_agency_2 FROM public.agencies WHERE name ILIKE '%GICO 8Kilos%' LIMIT 1;

    RAISE NOTICE 'Agence 1 (Général SARL) : %', v_agency_1;
    RAISE NOTICE 'Agence 2 (GICO 8Kilos) : %', v_agency_2;

    -- 2. Pour éviter la contrainte "uq_agency_single_director", 
    -- nous devons d'abord supprimer tout ANCIEN directeur éventuel 
    -- de ces deux agences (autre que nous-mêmes).
    IF v_agency_1 IS NOT NULL THEN
        DELETE FROM public.agency_users WHERE agency_id = v_agency_1 AND role = 'director' AND user_id <> v_user_id;
        
        -- Mettre à jour director_id sur l'agence
        UPDATE public.agencies SET director_id = v_user_id, status = 'approved' WHERE id = v_agency_1;
        
        -- Insérer ou mettre à jour notre lien
        INSERT INTO public.agency_users (user_id, agency_id, role)
        VALUES (v_user_id, v_agency_1, 'director')
        ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'director';
    END IF;

    IF v_agency_2 IS NOT NULL THEN
        DELETE FROM public.agency_users WHERE agency_id = v_agency_2 AND role = 'director' AND user_id <> v_user_id;
        
        -- Mettre à jour director_id sur l'agence
        UPDATE public.agencies SET director_id = v_user_id, status = 'approved' WHERE id = v_agency_2;
        
        -- Insérer ou mettre à jour notre lien
        INSERT INTO public.agency_users (user_id, agency_id, role)
        VALUES (v_user_id, v_agency_2, 'director')
        ON CONFLICT (user_id, agency_id) DO UPDATE SET role = 'director';
    END IF;

    -- 3. Nettoyer les agences "poubelles" liées au directeur par erreur (ex: Test)
    DELETE FROM public.agency_users
    WHERE user_id = v_user_id
    AND agency_id NOT IN (v_agency_1, v_agency_2)
    AND agency_id IN (SELECT id FROM public.agencies WHERE name ILIKE 'Test%');

END $$;

-- 4. Vérification finale
SELECT 
    a.name AS "Agence", 
    au.role AS "Rôle",
    a.city AS "Ville"
FROM public.agency_users au
JOIN public.agencies a ON a.id = au.agency_id
WHERE au.user_id = '7e1bb674-66ee-46f2-aec2-550231b660b0';
