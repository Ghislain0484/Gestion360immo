-- =====================================================================================
-- Script SQL pour générer rétroactivement les contrats de gestion (mandats) manquants
-- pour toutes les propriétés existantes de AGIM GROUP (ou d'autres agences).
--
-- A exécuter dans le "SQL Editor" de votre console Supabase.
-- =====================================================================================

-- 1. Insertion des mandats de gestion ('gestion') manquants pour AGIM GROUP
INSERT INTO public.contracts (
  id,
  agency_id,
  property_id,
  owner_id,
  tenant_id,
  type,
  start_date,
  commission_rate,
  commission_amount,
  status,
  terms,
  documents,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  p.agency_id,
  p.id as property_id,
  p.owner_id,
  '00000000-0000-0000-0000-000000000000'::uuid as tenant_id,
  'gestion'::public.contract_type as type,
  COALESCE(p.created_at::date, NOW()::date) as start_date,
  10 as commission_rate, -- Taux par défaut à 10%
  0 as commission_amount,
  'active'::public.contract_status as status,
  'CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE (OHADA)
  
Entre l''Agence Immobilière Mandataire et le Propriétaire Mandant.

Ce contrat confère à l''Agence le pouvoir de gérer la propriété désignée, d''en percevoir les loyers et d''accomplir tous les actes nécessaires à sa bonne gestion en contrepartie d''une commission fixée aux présentes.' as terms,
  '[]'::jsonb as documents,
  NOW() as created_at,
  NOW() as updated_at
FROM public.properties p
WHERE p.agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd' -- ID de AGIM GROUP
  AND p.owner_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.property_id = p.id AND c.type = 'gestion'
  );

-- 2. Optionnel : Pour appliquer la génération à toutes les agences de la plateforme,
-- vous pouvez exécuter cette version (décommenter pour l'utiliser) :
/*
INSERT INTO public.contracts (
  id,
  agency_id,
  property_id,
  owner_id,
  tenant_id,
  type,
  start_date,
  commission_rate,
  commission_amount,
  status,
  terms,
  documents,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  p.agency_id,
  p.id as property_id,
  p.owner_id,
  '00000000-0000-0000-0000-000000000000'::uuid as tenant_id,
  'gestion'::public.contract_type as type,
  COALESCE(p.created_at::date, NOW()::date) as start_date,
  10 as commission_rate,
  0 as commission_amount,
  'active'::public.contract_status as status,
  'CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE (OHADA)

Entre l''Agence Immobilière Mandataire et le Propriétaire Mandant.' as terms,
  '[]'::jsonb as documents,
  NOW() as created_at,
  NOW() as updated_at
FROM public.properties p
WHERE p.owner_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.property_id = p.id AND c.type = 'gestion'
  );
*/
