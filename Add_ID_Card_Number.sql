-- ============================================================
-- Ajout du champ Pièce d'identité pour Locataires et Propriétaires
-- ============================================================

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS id_card_number text;

ALTER TABLE public.owners
ADD COLUMN IF NOT EXISTS id_card_number text;

-- Mettre à jour la vue ou RPC si nécessaire (souvent pas besoin car select *)
