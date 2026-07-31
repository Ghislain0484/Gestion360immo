-- =====================================================================================
-- Script SQL pour générer rétroactivement un unique contrat de gestion (mandat global)
-- par propriétaire pour toutes les propriétés existantes de AGIM GROUP (Option 2).
--
-- A exécuter dans le "SQL Editor" de votre console Supabase.
-- =====================================================================================

-- 1. Insertion d'un unique mandat de gestion globale ('gestion') par propriétaire pour AGIM GROUP
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
  o.agency_id,
  NULL as property_id, -- Pas de bien individuel spécifique, gestion globale du portefeuille
  o.id as owner_id,
  NULL as tenant_id,
  'gestion'::public.contract_type as type,
  COALESCE(o.created_at::date, NOW()::date) as start_date,
  10 as commission_rate, -- Taux par défaut de 10%
  0 as commission_amount,
  'active'::public.contract_status as status,
  'CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE GLOBALE (OHADA)
  
Entre l''Agence Immobilière Mandataire et le Propriétaire Mandant.

Ce mandat de gestion global couvre l''ensemble des biens immobiliers actuels et futurs confiés par le Propriétaire à l''Agence, sous les conditions financières définies aux présentes (commissions et honoraires fixes).' as terms,
  '[]'::jsonb as documents,
  NOW() as created_at,
  NOW() as updated_at
FROM public.owners o
WHERE o.agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd' -- ID de AGIM GROUP
  AND NOT EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.owner_id = o.id AND c.type = 'gestion'
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
  o.agency_id,
  NULL as property_id,
  o.id as owner_id,
  NULL as tenant_id,
  'gestion'::public.contract_type as type,
  COALESCE(o.created_at::date, NOW()::date) as start_date,
  10 as commission_rate,
  0 as commission_amount,
  'active'::public.contract_status as status,
  'CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE GLOBALE (OHADA)

Entre l''Agence Immobilière Mandataire et le Propriétaire Mandant.' as terms,
  '[]'::jsonb as documents,
  NOW() as created_at,
  NOW() as updated_at
FROM public.owners o
WHERE NOT EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.owner_id = o.id AND c.type = 'gestion'
  );
*/
