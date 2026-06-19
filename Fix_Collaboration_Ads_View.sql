-- ==============================================================================
-- FIX COLLABORATION ADS VIEW - ACCÈS PUBLIC AUX INFOS DE L'AGENCE SANS FAILLES RLS
-- ==============================================================================
-- Ce script corrige la faille de sécurité signalée par Supabase Advisor :
-- La vue publique 'collaboration_ads_with_agency' est désormais configurée en 
-- SECURITY INVOKER pour respecter strictement le RLS sur les annonces.
-- Les détails de l'agence (nom/logo) sont obtenus via un schéma privé 
-- 'private.agencies_public_info' en SECURITY DEFINER, qui n'expose QUE les colonnes
-- non sensibles, garantissant la protection de la colonne confidentielle 'settings'.

-- 1. Créer le schéma privé s'il n'existe pas
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Supprimer les anciennes vues pour éviter les conflits de types
DROP VIEW IF EXISTS public.collaboration_ads_with_agency;
DROP VIEW IF EXISTS public.agencies_public_info;
DROP VIEW IF EXISTS private.agencies_public_info;

-- 3. Créer la vue privée d'informations publiques de l'agence (SECURITY DEFINER)
-- S'exécute avec les privilèges 'postgres' (bypasse RLS sur agencies),
-- mais ne sélectionne et n'expose QUE 'id', 'name', 'logo_url'.
CREATE OR REPLACE VIEW private.agencies_public_info 
WITH (security_barrier)
AS
SELECT id, name, logo_url
FROM public.agencies;

ALTER VIEW private.agencies_public_info OWNER TO postgres;

-- 4. Créer la vue publique de pont (SECURITY INVOKER)
-- Recommandé par Supabase (PG15+) pour exposer proprement les données non sensibles à l'API.
CREATE OR REPLACE VIEW public.agencies_public_info 
WITH (security_invoker = true) 
AS
SELECT * FROM private.agencies_public_info;

ALTER VIEW public.agencies_public_info OWNER TO postgres;
REVOKE ALL ON public.agencies_public_info FROM public;
GRANT SELECT ON public.agencies_public_info TO authenticated;
GRANT SELECT ON public.agencies_public_info TO anon;

-- 5. Créer la vue principale de collaboration (SECURITY INVOKER)
-- Le RLS sur la table 'collaboration_ads' sera maintenant parfaitement appliqué.
CREATE OR REPLACE VIEW public.collaboration_ads_with_agency 
WITH (security_invoker = true) 
AS
SELECT 
  ca.*,
  a.name AS agency_name,
  a.logo_url AS agency_logo_url
FROM public.collaboration_ads ca
LEFT JOIN public.agencies_public_info a ON ca.agency_id = a.id;

ALTER VIEW public.collaboration_ads_with_agency OWNER TO postgres;
REVOKE ALL ON public.collaboration_ads_with_agency FROM public;
GRANT SELECT ON public.collaboration_ads_with_agency TO authenticated;
GRANT SELECT ON public.collaboration_ads_with_agency TO anon;

SELECT '✅ Vue collaboration_ads_with_agency et agencies_public_info configurées en SECURITY INVOKER.' as status;
