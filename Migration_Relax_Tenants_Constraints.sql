-- =========================================================
-- MIGRATION: RENDRE LES CHAMPS LOCATAIRES FACULTATIFS
-- =========================================================
-- Cette migration assouplit les contraintes de la table 'tenants'
-- pour permettre une saisie rapide et éviter les erreurs de type
-- "null value violates not-null constraint".

ALTER TABLE public.tenants 
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN marital_status DROP NOT NULL,
  ALTER COLUMN profession DROP NOT NULL,
  ALTER COLUMN nationality DROP NOT NULL,
  ALTER COLUMN payment_status DROP NOT NULL;

-- Note: On garde 'first_name', 'last_name' et 'phone' obligatoires
-- car ce sont les informations d'identification minimales.

COMMENT ON COLUMN public.tenants.profession IS 'Facultatif pour plus de souplesse';
COMMENT ON COLUMN public.tenants.nationality IS 'Facultatif pour plus de souplesse';
