-- ==============================================================================
-- FIX COLLABORATION ADS VIEW - ACCÈS PUBLIC AUX INFOS DE L'AGENCE SANS FAILLES RLS
-- ==============================================================================
-- Ce script crée une vue de lecture publique 'collaboration_ads_with_agency' qui
-- joint automatiquement les détails non sensibles de l'agence (nom et logo).
-- Cela permet à toutes les agences de voir quelle agence a publié l'annonce sans
-- avoir à ouvrir l'accès en lecture RLS à la colonne sensible 'settings' de la table public.agencies.

-- 1. Supprimer la vue si elle existe déjà
DROP VIEW IF EXISTS public.collaboration_ads_with_agency;

-- 2. Créer la vue avec les informations de l'agence
CREATE OR REPLACE VIEW public.collaboration_ads_with_agency AS
SELECT 
  ca.*,
  a.name AS agency_name,
  a.logo_url AS agency_logo_url
FROM public.collaboration_ads ca
LEFT JOIN public.agencies a ON ca.agency_id = a.id;

-- 3. Configurer les droits de la vue pour les rôles authenticated et anon
ALTER VIEW public.collaboration_ads_with_agency OWNER TO postgres;
REVOKE ALL ON public.collaboration_ads_with_agency FROM public;
GRANT SELECT ON public.collaboration_ads_with_agency TO authenticated;
GRANT SELECT ON public.collaboration_ads_with_agency TO anon;

SELECT '✅ Vue collaboration_ads_with_agency configurée avec succès.' as status;
