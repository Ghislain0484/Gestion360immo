-- ==============================================================================
-- PATCH DE SÉCURITÉ GESTION360 : RLS ET FONCTIONS
-- Ce script résout les erreurs critiques et les avertissements du Security Advisor
-- Exécutez ce code dans le SQL Editor de Supabase
-- ==============================================================================

-- ==============================================================================
-- PARTIE 1 : SÉCURISATION AUTOMATIQUE DES FONCTIONS (WARNINGS)
-- Ajoute "SET search_path = public" et retire l'accès "anon" de toutes 
-- les fonctions SECURITY DEFINER pour boucher les failles d'injection.
-- ==============================================================================
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Trouve toutes les fonctions SECURITY DEFINER dans le schéma public
    FOR r IN 
        SELECT p.oid::regprocedure AS proc_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
    LOOP
        -- Fixe le chemin de recherche
        EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.proc_name);
        -- Révoque l'accès au rôle anonyme (API publique non authentifiée)
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.proc_name);
    END LOOP;
END $$;


-- ==============================================================================
-- PARTIE 2 : CORRECTION DES ERREURS 500 ET RÉACTIVATION DU RLS
-- Utilise public.check_agency_access() pour éviter toute boucle récursive (500)
-- ==============================================================================

-- --------------------------------------------------------
-- A. TABLE: agency_users
-- --------------------------------------------------------
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

-- Les membres de l'agence peuvent lire la liste des utilisateurs de leur agence
DROP POLICY IF EXISTS "Users can read their agency users" ON public.agency_users;
CREATE POLICY "Users can read their agency users" ON public.agency_users
FOR SELECT TO authenticated
USING (public.check_agency_access(agency_id));

-- Les directeurs peuvent gérer (CRUD) les utilisateurs de leur agence
DROP POLICY IF EXISTS "Directors can manage their agency users" ON public.agency_users;
CREATE POLICY "Directors can manage their agency users" ON public.agency_users
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.agencies 
        WHERE director_id = auth.uid() 
        AND agency_id = public.agency_users.agency_id
    )
);

-- --------------------------------------------------------
-- B. TABLE: contracts
-- --------------------------------------------------------
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Accès Agence complet (via check_agency_access)
DROP POLICY IF EXISTS "Agency users can access contracts" ON public.contracts;
CREATE POLICY "Agency users can access contracts" ON public.contracts
FOR ALL TO authenticated
USING (public.check_agency_access(agency_id));

-- Accès Propriétaire (lecture seule)
DROP POLICY IF EXISTS "owner_read_own_contracts" ON public.contracts;
CREATE POLICY "owner_read_own_contracts" ON public.contracts
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        JOIN public.owners o ON o.id = p.owner_id
        WHERE p.id = public.contracts.property_id
        AND o.user_id = auth.uid()
    )
);

-- --------------------------------------------------------
-- C. TABLE: rent_receipts
-- --------------------------------------------------------
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;

-- Accès Agence complet via le contrat lié
DROP POLICY IF EXISTS "Agency users can access receipts" ON public.rent_receipts;
CREATE POLICY "Agency users can access receipts" ON public.rent_receipts
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = public.rent_receipts.contract_id
        AND public.check_agency_access(c.agency_id)
    )
);

-- Accès Propriétaire (lecture seule)
DROP POLICY IF EXISTS "owner_read_own_receipts" ON public.rent_receipts;
CREATE POLICY "owner_read_own_receipts" ON public.rent_receipts
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        JOIN public.owners o ON o.id = p.owner_id
        WHERE c.id = public.rent_receipts.contract_id
        AND o.user_id = auth.uid()
    )
);

SELECT '✅ Migration de sécurité effectuée avec succès' as status;
