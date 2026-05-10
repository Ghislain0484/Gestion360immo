-- ==============================================================================
-- FIX MINIMALISTE : ISOLATION MAXIMALE
-- ==============================================================================

-- 1. On purge TOUTES les politiques sur agency_users
DROP POLICY IF EXISTS "agency_users_master_policy" ON public.agency_users;
DROP POLICY IF EXISTS "Users can read own agency users" ON public.agency_users;
DROP POLICY IF EXISTS "Directors can manage agency users" ON public.agency_users;
DROP POLICY IF EXISTS "Users can read their agency users" ON public.agency_users;

-- 2. On met UNE SEULE règle extrêmement basique (0 appel de fonction, 0 sous-requête)
-- "Je peux lire ma propre ligne"
CREATE POLICY "agency_users_basic_policy" ON public.agency_users
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. On réactive le RLS
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;

SELECT '✅ Fix minimaliste appliqué. Si l''erreur 500 disparaît, c''est que la boucle est enfin brisée.' as status;
