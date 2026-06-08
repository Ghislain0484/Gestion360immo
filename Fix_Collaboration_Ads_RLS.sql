-- ==============================================================================
-- FIX COLLABORATION ADS RLS - ACCÈS PUBLIC INTER-AGENCES
-- ==============================================================================
-- Ce script configure la table 'collaboration_ads' pour permettre à TOUTES les
-- agences de voir les opportunités publiées (SELECT), tout en limitant les actions
-- de modification (INSERT, UPDATE, DELETE) à l'agence propriétaire de l'annonce.

-- 1. Activer RLS sur la table
ALTER TABLE public.collaboration_ads ENABLE ROW LEVEL SECURITY;

-- 2. Nettoyer les anciennes politiques restrictives (dont master auto-généré)
DROP POLICY IF EXISTS "collaboration_ads_master_agency_all" ON public.collaboration_ads;
DROP POLICY IF EXISTS "collaboration_ads_select_all" ON public.collaboration_ads;
DROP POLICY IF EXISTS "collaboration_ads_insert_own" ON public.collaboration_ads;
DROP POLICY IF EXISTS "collaboration_ads_update_own" ON public.collaboration_ads;
DROP POLICY IF EXISTS "collaboration_ads_delete_own" ON public.collaboration_ads;

-- 3. Créer la politique de LECTURE publique (Tout utilisateur authentifié voit toutes les annonces)
CREATE POLICY "collaboration_ads_select_all" ON public.collaboration_ads
  FOR SELECT TO authenticated USING (true);

-- 4. Créer la politique d'INSERTION (Uniquement pour sa propre agence)
CREATE POLICY "collaboration_ads_insert_own" ON public.collaboration_ads
  FOR INSERT TO authenticated WITH CHECK (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
    OR agency_id IN (SELECT agency_id FROM public.users WHERE id = auth.uid())
    OR public.is_platform_admin()
  );

-- 5. Créer la politique de MISE À JOUR (Uniquement pour sa propre agence)
CREATE POLICY "collaboration_ads_update_own" ON public.collaboration_ads
  FOR UPDATE TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
    OR agency_id IN (SELECT agency_id FROM public.users WHERE id = auth.uid())
    OR public.is_platform_admin()
  ) WITH CHECK (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
    OR agency_id IN (SELECT agency_id FROM public.users WHERE id = auth.uid())
    OR public.is_platform_admin()
  );

-- 6. Créer la politique de SUPPRESSION (Uniquement pour sa propre agence)
CREATE POLICY "collaboration_ads_delete_own" ON public.collaboration_ads
  FOR DELETE TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
    OR agency_id IN (SELECT agency_id FROM public.users WHERE id = auth.uid())
    OR public.is_platform_admin()
  );

SELECT '✅ Politiques RLS pour collaboration_ads configurées pour le partage inter-agences.' as status;
