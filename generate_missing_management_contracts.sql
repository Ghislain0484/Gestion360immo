-- =====================================================================================
-- Script SQL pour nettoyer les doublons et migrer vers un unique contrat de gestion global
-- par propriétaire pour AGIM GROUP (Option 2).
--
-- A exécuter dans le "SQL Editor" de votre console Supabase.
-- =====================================================================================

BEGIN;

-- 1. On crée un mandat global (property_id = NULL) pour chaque propriétaire s'il n'en a pas encore
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
  10 as commission_rate, -- Taux par défaut à 10%
  0 as commission_amount,
  'active'::public.contract_status as status,
  'CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE GLOBALE (OHADA)
  
Entre l''Agence Immobilière Mandataire et le Propriétaire Mandant.

Ce mandat de gestion global couvre l''ensemble des biens immobiliers actuels et futurs confiés par le Propriétaire à l''Agence, sous les conditions financières définies aux présentes.' as terms,
  '[]'::jsonb as documents,
  NOW() as created_at,
  NOW() as updated_at
FROM public.owners o
WHERE o.agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd' -- ID de AGIM GROUP
  AND NOT EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.owner_id = o.id AND c.type = 'gestion' AND c.property_id IS NULL
  );

-- 2. On supprime les anciens contrats de gestion individuels par bien (qui font maintenant doublon)
DELETE FROM public.contracts
WHERE type = 'gestion'
  AND agency_id = '8561e4b6-0a47-47ba-9def-b2914885fedd'
  AND property_id IS NOT NULL;

COMMIT;
