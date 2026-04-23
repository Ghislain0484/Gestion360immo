-- =============================================================================
-- GESTION360 - OPTIMISATIONS DE STABILITÉ ET PERFORMANCE
-- 1. Synchronisation Auth/Public
-- 2. Performance RLS
-- 3. Concurrence Caisse
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. INTÉGRITÉ DE LA SYNCHRONISATION AUTH/PUBLIC
-- -----------------------------------------------------------------------------

-- Fonction pour réparer manuellement les utilisateurs manquants dans public.users
CREATE OR REPLACE FUNCTION public.sync_repair_users()
RETURNS TABLE (repaired_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Insérer les utilisateurs manquants dans public.users à partir de auth.users
    INSERT INTO public.users (id, email, first_name, last_name, is_active, created_at, updated_at)
    SELECT 
        au.id, 
        au.email, 
        COALESCE(au.raw_user_meta_data->>'first_name', 'Utilisateur'),
        COALESCE(au.raw_user_meta_data->>'last_name', 'Gestion360'),
        true,
        au.created_at,
        au.updated_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT v_count;
END;
$$;

-- Renforcement du trigger de création automatique
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, is_active)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'first_name', 'Utilisateur'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Gestion360'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 2. OPTIMISATION PERFORMANCE RLS
-- -----------------------------------------------------------------------------

-- Fonction optimisée pour récupérer l'agence active (mise en cache par transaction)
CREATE OR REPLACE FUNCTION public.get_active_agency_id()
RETURNS uuid 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_agency_id uuid;
BEGIN
    -- On cherche d'abord dans les paramètres de la session (très rapide)
    v_agency_id := current_setting('app.active_agency_id', true)::uuid;
    
    IF v_agency_id IS NULL THEN
        -- Sinon on cherche en base
        SELECT agency_id INTO v_agency_id
        FROM public.agency_users
        WHERE user_id = auth.uid()
        LIMIT 1;
        
        -- Note: Si vous utilisez Supavisor en mode 'session', vous pouvez décommenter :
        -- PERFORM set_config('app.active_agency_id', v_agency_id::text, true);
    END IF;
    
    RETURN v_agency_id;
END;
$$;

-- Application des politiques RLS optimisées sur les tables principales
-- (Exemple pour 'properties', à répéter pour les autres)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agency isolation for properties" ON public.properties;
CREATE POLICY "Agency isolation for properties" ON public.properties
    FOR ALL
    USING (agency_id = public.get_active_agency_id());

-- Répéter pour les autres tables critiques
-- ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Agency isolation for tenants" ON public.tenants FOR ALL USING (agency_id = public.get_active_agency_id());
-- ... etc

-- -----------------------------------------------------------------------------
-- 3. GESTION DE LA CONCURRENCE CAISSE
-- -----------------------------------------------------------------------------

-- Procédure pour traiter une transaction financière de manière atomique et sécurisée
CREATE OR REPLACE FUNCTION public.process_secure_transaction(
    p_agency_id UUID,
    p_amount DECIMAL,
    p_type TEXT, -- 'in' or 'out'
    p_category TEXT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
    v_lock_id BIGINT;
BEGIN
    -- Utilisation d'un verrou consultatif (Advisory Lock) basé sur l'ID de l'agence
    -- Cela empêche deux transactions de la MÊME agence d'être traitées simultanément
    v_lock_id := ('x' || substr(md5(p_agency_id::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_id);

    -- Insertion de la transaction
    INSERT INTO public.modular_transactions (
        agency_id,
        amount,
        type,
        category,
        description,
        metadata,
        created_at
    )
    VALUES (
        p_agency_id,
        p_amount,
        p_type,
        p_category,
        p_description,
        p_metadata,
        now()
    )
    RETURNING id INTO v_transaction_id;

    -- Note: On pourrait ici mettre à jour une table de solde agrégée si nécessaire
    
    RETURN v_transaction_id;
END;
$$;

-- Commentaire de documentation
COMMENT ON FUNCTION public.sync_repair_users IS 'Répare les liens manquants entre auth.users et public.users.';
COMMENT ON FUNCTION public.get_active_agency_id IS 'Version ultra-performante du filtrage RLS.';
COMMENT ON FUNCTION public.process_secure_transaction IS 'Traite une transaction financière avec verrouillage anti-concurrence.';
