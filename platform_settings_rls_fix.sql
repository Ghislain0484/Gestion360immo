-- ==============================================================================
-- GESTION360 : CORRECTIF RLS CHIRURGICAL POUR PARAMÈTRES PLATEFORME
-- ==============================================================================
-- À exécuter dans : Supabase → SQL Editor
-- Ce script est sûr pour la production, ne supprime aucune donnée,
-- et préserve l'intégrité de toutes les agences et utilisateurs.
-- ==============================================================================

BEGIN;

-- 1. CORRECTION DE LA FONCTION is_platform_admin()
-- Passage en PL/pgSQL stable pour interdire à l'optimiseur Postgres d'inliner 
-- la fonction dans les expressions de politiques RLS (ce qui détruisait le SECURITY DEFINER).
-- Enrichissement du search_path avec 'auth' et 'extensions' pour garantir la bonne résolution de auth.uid().
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE user_id = auth.uid() 
    AND (is_active = true OR is_active IS NULL) 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Rétablir les droits d'exécution
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 2. SIMPLIFICATION ET SÉCURISATION DE LA TABLE platform_settings
-- Activation de RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Suppression des anciennes politiques conflictuelles
DROP POLICY IF EXISTS "public_settings_read" ON public.platform_settings;
DROP POLICY IF EXISTS "admin_all_settings" ON public.platform_settings;
DROP POLICY IF EXISTS "admin_select_settings" ON public.platform_settings;
DROP POLICY IF EXISTS "admin_insert_settings" ON public.platform_settings;
DROP POLICY IF EXISTS "admin_update_settings" ON public.platform_settings;
DROP POLICY IF EXISTS "admin_delete_settings" ON public.platform_settings;

-- Règle de lecture : Les paramètres publics sont lisibles par tous les utilisateurs connectés.
-- Les paramètres privés (non-publics) ne sont lisibles que par les admins de la plateforme.
CREATE POLICY "public_settings_read" ON public.platform_settings
    FOR SELECT TO authenticated
    USING (is_public = true OR public.is_platform_admin());

-- Règle d'insertion : Seuls les administrateurs plateforme peuvent insérer de nouveaux paramètres.
CREATE POLICY "admin_insert_settings" ON public.platform_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.is_platform_admin());

-- Règle de mise à jour : Seuls les administrateurs plateforme peuvent modifier les paramètres existants.
CREATE POLICY "admin_update_settings" ON public.platform_settings
    FOR UPDATE TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Règle de suppression : Seuls les administrateurs plateforme peuvent supprimer un paramètre.
CREATE POLICY "admin_delete_settings" ON public.platform_settings
    FOR DELETE TO authenticated
    USING (public.is_platform_admin());

COMMIT;

-- Afficher l'état de vérification des politiques
SELECT policyname, tablename, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'platform_settings';
