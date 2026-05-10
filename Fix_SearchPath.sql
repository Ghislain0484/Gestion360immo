-- ==============================================================================
-- CORRECTION DE L'ERREUR 500 : PROBLÈME DE CHEMIN DE RECHERCHE (auth.uid)
-- Les fonctions PL/pgSQL précédentes ne trouvaient pas auth.uid()
-- ==============================================================================

-- 1. Fonction : my_agency_id()
CREATE OR REPLACE FUNCTION public.my_agency_id() RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  RETURN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

-- 2. Fonction : get_my_agency_id()
CREATE OR REPLACE FUNCTION public.get_my_agency_id() RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  RETURN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

-- 3. Fonction : get_my_agency_ids()
CREATE OR REPLACE FUNCTION public.get_my_agency_ids() RETURNS TABLE (agency_id UUID)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  RETURN QUERY SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid();
END;
$$;

-- 4. Fonction : is_agency_member(UUID)
CREATE OR REPLACE FUNCTION public.is_agency_member(p_agency_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
END;
$$;

-- 5. Fonction : check_agency_access(UUID)
CREATE OR REPLACE FUNCTION public.check_agency_access(p_agency_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
END;
$$;

-- 6. Fonction : i_am_director_of(UUID)
CREATE OR REPLACE FUNCTION public.i_am_director_of(p_agency_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agencies 
    WHERE id = p_agency_id AND director_id = auth.uid()
  );
END;
$$;

SELECT '✅ Fonctions corrigées. Le search_path contient maintenant auth.uid().' as status;
