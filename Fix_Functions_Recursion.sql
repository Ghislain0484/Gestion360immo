-- ==============================================================================
-- FIX RÉCURSION DÉFINITIF : CONVERSION DES FONCTIONS SQL EN PL/pgSQL
-- Empêche PostgreSQL de "inliner" les fonctions et de perdre le SECURITY DEFINER
-- À exécuter dans le SQL Editor de Supabase
-- ==============================================================================

-- 1. Fonction : my_agency_id()
CREATE OR REPLACE FUNCTION public.my_agency_id() RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1);
END;
$$;
ALTER FUNCTION public.my_agency_id() OWNER TO postgres;

-- 2. Fonction : get_my_agency_id()
CREATE OR REPLACE FUNCTION public.get_my_agency_id() RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1);
END;
$$;
ALTER FUNCTION public.get_my_agency_id() OWNER TO postgres;

-- 3. Fonction : get_my_agency_ids()
CREATE OR REPLACE FUNCTION public.get_my_agency_ids() RETURNS TABLE (agency_id UUID)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid();
END;
$$;
ALTER FUNCTION public.get_my_agency_ids() OWNER TO postgres;

-- 4. Fonction : is_agency_member(UUID)
CREATE OR REPLACE FUNCTION public.is_agency_member(p_agency_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
END;
$$;
ALTER FUNCTION public.is_agency_member(UUID) OWNER TO postgres;

-- 5. Fonction : check_agency_access(UUID)
CREATE OR REPLACE FUNCTION public.check_agency_access(p_agency_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
END;
$$;
ALTER FUNCTION public.check_agency_access(UUID) OWNER TO postgres;


-- ==============================================================================
-- RÉACTIVATION DU RLS SUR LES TABLES
-- ==============================================================================
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;

SELECT '✅ Fonctions utilitaires converties en PL/pgSQL et RLS réactivé sans boucle infinie.' as status;
