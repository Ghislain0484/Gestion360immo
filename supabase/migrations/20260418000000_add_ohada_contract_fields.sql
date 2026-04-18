-- Migration : Ajout des champs OHADA pour la flexibilité des contrats
-- Description : Permet de définir précisément le nombre de mois de caution et d'avance

-- Ajout des colonnes à la table contracts
-- On utilise des valeurs par défaut correspondant à l'usage le plus courant (2 mois)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS deposit_months INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS advance_rent_months INTEGER DEFAULT 2;

-- Mise à jour des commentaires pour la documentation
COMMENT ON COLUMN public.contracts.deposit_months IS 'Nombre de mois de caution versés à la signature';
COMMENT ON COLUMN public.contracts.advance_rent_months IS 'Nombre de mois de loyer payés d''avance à la signature (conforment OHADA)';

-- Note : Ces modifications sont rétrocompatibles. 
-- Les contrats existants auront par défaut 2 mois de caution et 2 mois d'avance.
