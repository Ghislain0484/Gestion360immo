-- ================================================================
-- FIX DEFINITIF : PORTAIL PROPRIETAIRE
-- Execute TOUT CE SCRIPT dans Supabase > SQL Editor
-- ================================================================

-- ============================================================
-- ETAPE 1: Ajouter la colonne user_id si elle n'existe pas
-- ============================================================
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON public.owners(user_id);

-- ============================================================
-- ETAPE 2: CRITIQUE - Ajouter une politique RLS self-read pour les proprietaires
-- Sans ca, un proprietaire authentifie ne peut pas lire sa propre fiche
-- ============================================================
DROP POLICY IF EXISTS "owner_read_own_profile" ON public.owners;
CREATE POLICY "owner_read_own_profile" ON public.owners FOR SELECT TO authenticated
USING (
  -- Le proprietaire peut lire sa propre fiche (apres liaison user_id)
  user_id = auth.uid()
  OR
  -- Ou bien via email (avant liaison, pour le premier login)
  LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt() ->> 'email'))
);

DROP POLICY IF EXISTS "owner_update_own_user_id" ON public.owners;
CREATE POLICY "owner_update_own_user_id" ON public.owners FOR UPDATE TO authenticated
USING (LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt() ->> 'email')))
WITH CHECK (LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt() ->> 'email')));

-- ============================================================
-- ETAPE 3: Lier les propriétaires existants à leur compte Auth
-- ============================================================
UPDATE public.owners o
SET user_id = u.id
FROM auth.users u
WHERE LOWER(TRIM(o.email)) = LOWER(TRIM(u.email))
  AND o.user_id IS NULL;

-- ============================================================
-- ETAPE 4: Fonction RPC sécurisée pour la vérification avant connexion
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_owner_activation(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT first_name, last_name, user_id 
    INTO v_record
    FROM public.owners
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF v_record IS NOT NULL THEN
        RETURN jsonb_build_object(
            'exists', true,
            'activated', (v_record.user_id IS NOT NULL),
            'owner_name', v_record.first_name || ' ' || v_record.last_name
        );
    ELSE
        RETURN jsonb_build_object('exists', false, 'activated', false);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_owner_activation(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_owner_activation(TEXT) TO authenticated;

-- ============================================================
-- ETAPE 5: Trigger robuste
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_owner_registration()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    UPDATE public.owners
    SET user_id = NEW.id
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error linking owner for %: %', NEW.email, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_for_owner ON auth.users;
CREATE TRIGGER on_auth_user_created_for_owner
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_owner_registration();

-- ============================================================
-- VERIFICATION FINALE
-- ============================================================
SELECT 
  o.id, 
  o.first_name, 
  o.last_name, 
  o.email,
  CASE WHEN o.user_id IS NOT NULL THEN 'Compte lie ✅' ELSE 'Non lie ❌' END AS statut_liaison
FROM public.owners o
LIMIT 20;
