-- ==============================================================================
-- LE FIX ULTIME DE RÉCURSION : ISOLATION TOTALE DE AGENCY_USERS
-- À exécuter immédiatement dans le SQL Editor de Supabase
-- ==============================================================================

-- 1. CRÉER UNE FONCTION QUI CONTOURNE LE RLS POUR TROUVER SI ON EST DIRECTEUR
-- Cette fonction va interroger "agencies" de manière sécurisée sans déclencher son RLS.
CREATE OR REPLACE FUNCTION public.i_am_director_of(p_agency_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agencies 
    WHERE id = p_agency_id AND director_id = auth.uid()
  );
END;
$$;
ALTER FUNCTION public.i_am_director_of(UUID) OWNER TO postgres;


-- 2. RECONSTRUIRE LA POLITIQUE DE AGENCY_USERS SANS AUCUNE SOUS-REQUÊTE DIRECTE
DROP POLICY IF EXISTS "Users can read own agency users" ON public.agency_users;
DROP POLICY IF EXISTS "Directors can manage agency users" ON public.agency_users;
DROP POLICY IF EXISTS "Users can read their agency users" ON public.agency_users;

-- Règle unique et propre : Je lis ma ligne, OU je lis les lignes de l'agence dont je suis directeur.
CREATE POLICY "agency_users_master_policy" ON public.agency_users
FOR ALL TO authenticated
USING (
    user_id = auth.uid() 
    OR 
    public.i_am_director_of(agency_id)
)
WITH CHECK (
    user_id = auth.uid() 
    OR 
    public.i_am_director_of(agency_id)
);


-- 3. ASSURER QUE LES AUTRES FONCTIONS DE SÉCURITÉ CONTOURNENT BIEN LE RLS
ALTER FUNCTION public.my_agency_id() OWNER TO postgres;
ALTER FUNCTION public.get_my_agency_id() OWNER TO postgres;
ALTER FUNCTION public.get_my_agency_ids() OWNER TO postgres;
ALTER FUNCTION public.is_agency_member(UUID) OWNER TO postgres;
ALTER FUNCTION public.check_agency_access(UUID) OWNER TO postgres;

-- 4. RÉACTIVER LE RLS EN TOUTE SÉCURITÉ
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;

SELECT '✅ Fix Ultime Appliqué. La boucle est définitivement brisée.' as status;
