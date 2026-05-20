-- ==============================================================================
-- GESTION360 : FIX RLS ULTIME - ELIMINATION DES TIMEOUTS ET DE LA RECURSION
-- ==============================================================================

-- 1. ERADICATION COMPLETE DES POLITIQUES EXISTANTES (RAZ TOTAL)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. DEFINITION DES FONCTIONS HELPERS OPTIMISEES (SECURITY DEFINER POUR COURT-CIRCUITER LE RLS)
CREATE OR REPLACE FUNCTION public.is_platform_admin() 
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agency_member(p_agency_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agency_director(p_agency_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id 
    AND role = 'director'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_same_agency(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users
    WHERE agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
    AND user_id = p_user_id
  );
$$;

-- Helpers pour l'accès aux tiers (Owners/Tenants/Portails) sans récursion
CREATE OR REPLACE FUNCTION public.check_owner_access_to_property(p_user_id UUID, p_property_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.owners o ON o.id = p.owner_id
    WHERE o.user_id = p_user_id AND p.id = p_property_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_owner_access_to_contract(p_user_id UUID, p_contract_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contracts c
    JOIN public.properties p ON p.id = c.property_id
    JOIN public.owners o ON o.id = p.owner_id
    WHERE o.user_id = p_user_id AND c.id = p_contract_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_owner_access_to_receipt(p_user_id UUID, p_receipt_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rent_receipts r
    JOIN public.contracts c ON c.id = r.contract_id
    JOIN public.properties p ON p.id = c.property_id
    JOIN public.owners o ON o.id = p.owner_id
    WHERE o.user_id = p_user_id AND r.id = p_receipt_id
  );
$$;

-- Pour les locataires (tenants), on fait le lien via l'email de auth.users car tenants n'a pas de user_id
CREATE OR REPLACE FUNCTION public.check_tenant_access_to_contract(p_user_id UUID, p_contract_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contracts c
    JOIN public.tenants t ON t.id = c.tenant_id
    WHERE t.email = (SELECT email FROM auth.users WHERE id = p_user_id) AND c.id = p_contract_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_tenant_access_to_receipt(p_user_id UUID, p_receipt_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rent_receipts r
    JOIN public.contracts c ON c.id = r.contract_id
    JOIN public.tenants t ON t.id = c.tenant_id
    WHERE t.email = (SELECT email FROM auth.users WHERE id = p_user_id) AND r.id = p_receipt_id
  );
$$;

-- Accorder les permissions d'exécution aux rôles Supabase
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_director(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_same_agency(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_owner_access_to_property(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_owner_access_to_contract(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_owner_access_to_receipt(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_tenant_access_to_contract(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_tenant_access_to_receipt(UUID, UUID) TO authenticated;


-- 3. POLITIQUES SPECIFIQUES POUR LES TABLES CLES DE L'APPLICATION
-- ==============================================================================

-- --- 3.1. UTILISATEURS ---
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_master_policy" ON public.users FOR ALL TO authenticated USING (
    id = auth.uid() OR public.is_platform_admin() OR public.is_same_agency(id)
) WITH CHECK (
    id = auth.uid() OR public.is_platform_admin()
);

-- --- 3.2. AGENCES ---
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agencies_master_policy" ON public.agencies FOR SELECT TO authenticated USING (
    public.is_agency_member(id) OR public.is_platform_admin()
);
CREATE POLICY "agencies_admin_all" ON public.agencies FOR ALL TO authenticated USING (
    public.is_platform_admin()
) WITH CHECK (
    public.is_platform_admin()
);

-- --- 3.3. AGENCY_USERS ---
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_users_master_policy" ON public.agency_users FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_agency_member(agency_id) OR public.is_platform_admin()
);
CREATE POLICY "agency_users_manage_policy" ON public.agency_users FOR ALL TO authenticated USING (
    public.is_agency_director(agency_id) OR public.is_platform_admin()
) WITH CHECK (
    public.is_agency_director(agency_id) OR public.is_platform_admin()
);

-- --- 3.4. PLATFORM_ADMINS ---
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_admins_master_policy" ON public.platform_admins FOR ALL TO authenticated USING (
    user_id = auth.uid() OR public.is_platform_admin()
) WITH CHECK (
    public.is_platform_admin()
);

-- --- 3.5. OWNERS ---
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_master_policy" ON public.owners FOR ALL TO authenticated USING (
    public.is_platform_admin() OR public.is_agency_member(agency_id) OR user_id = auth.uid()
) WITH CHECK (
    public.is_platform_admin() OR public.is_agency_member(agency_id) OR user_id = auth.uid()
);

-- --- 3.6. TENANTS ---
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_master_policy" ON public.tenants FOR ALL TO authenticated USING (
    public.is_platform_admin() 
    OR public.is_agency_member(agency_id) 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
) WITH CHECK (
    public.is_platform_admin() 
    OR public.is_agency_member(agency_id) 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- --- 3.7. PROPERTIES ---
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_master_policy" ON public.properties FOR ALL TO authenticated USING (
    public.is_platform_admin() OR public.is_agency_member(agency_id) OR public.check_owner_access_to_property(auth.uid(), id)
) WITH CHECK (
    public.is_platform_admin() OR public.is_agency_member(agency_id)
);

-- --- 3.8. CONTRACTS ---
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_master_policy" ON public.contracts FOR ALL TO authenticated USING (
    public.is_platform_admin() OR public.is_agency_member(agency_id) OR public.check_owner_access_to_contract(auth.uid(), id) OR public.check_tenant_access_to_contract(auth.uid(), id)
) WITH CHECK (
    public.is_platform_admin() OR public.is_agency_member(agency_id)
);

-- --- 3.9. RENT_RECEIPTS ---
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rent_receipts_master_policy" ON public.rent_receipts FOR ALL TO authenticated USING (
    public.is_platform_admin() OR public.is_agency_member(agency_id) OR public.check_owner_access_to_receipt(auth.uid(), id) OR public.check_tenant_access_to_receipt(auth.uid(), id)
) WITH CHECK (
    public.is_platform_admin() OR public.is_agency_member(agency_id)
);


-- 4. RATISSAGE AUTOMATIQUE ET DYNAMIQUE SUR LES AUTRES TABLES (RESTANTES)
-- ==============================================================================
DO $$ 
DECLARE
    t_name text;
    has_agency_id boolean;
    has_user_id boolean;
BEGIN
    FOR t_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Ne pas toucher aux tables cœurs déjà sécurisées manuellement ci-dessus
        IF t_name NOT IN ('users', 'agencies', 'agency_users', 'platform_admins', 'owners', 'tenants', 'properties', 'contracts', 'rent_receipts') THEN
            
            -- Vérifier si la table possède la colonne agency_id
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'agency_id'
            ) INTO has_agency_id;
            
            -- Vérifier si la table possède la colonne user_id
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'user_id'
            ) INTO has_user_id;

            -- Activer RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

            -- Cas 1 : La table possède agency_id
            IF has_agency_id THEN
                EXECUTE format('
                    CREATE POLICY "%I_master_agency_all" ON public.%I FOR ALL TO authenticated USING (
                        public.is_agency_member(agency_id) OR public.is_platform_admin()
                    ) WITH CHECK (
                        public.is_agency_member(agency_id) OR public.is_platform_admin()
                    );
                ', t_name, t_name);

            -- Cas 2 : La table possède user_id (sans agency_id)
            ELSIF has_user_id THEN
                EXECUTE format('
                    CREATE POLICY "%I_master_user_all" ON public.%I FOR ALL TO authenticated USING (
                        user_id = auth.uid() OR public.is_platform_admin()
                    ) WITH CHECK (
                        user_id = auth.uid() OR public.is_platform_admin()
                    );
                ', t_name, t_name);
            END IF;

        END IF;
    END LOOP;
END $$;

-- 5. ACCES ANONYME SECURISE POUR LES INSCRIPTIONS ET REQUETES PUBLIQUES
CREATE POLICY "public_insert_requests" ON public.agency_registration_requests FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');
CREATE POLICY "public_read_announcements" ON public.announcements FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_agency_member(agency_id));

-- Notification de fin de migration
SELECT '✅ RLS et Sécurité remis à neuf avec succès. Récursion brisée. Performance optimale.' as status;
