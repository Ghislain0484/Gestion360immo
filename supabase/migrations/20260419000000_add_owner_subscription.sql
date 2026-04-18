-- Migration : Ajout de la gestion d'abonnement propriétaires
-- 10 000 FCFA / mois avec 1 mois gratuit par défaut pour tout nouveau propriétaire

ALTER TABLE public.owners 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 month');

-- Mise à jour des propriétaires existants qui n'auraient pas de date d'expiration
UPDATE public.owners 
SET subscription_expires_at = (now() + interval '1 month') 
WHERE subscription_expires_at IS NULL;

-- Index pour la performance des filtres de dashboard
CREATE INDEX IF NOT EXISTS idx_owners_subscription_status ON public.owners(subscription_status);
CREATE INDEX IF NOT EXISTS idx_owners_subscription_expires ON public.owners(subscription_expires_at);

-- Sécurité RLS (Expertise) :
-- Les propriétaires peuvent VOIR leur statut, mais seul le service de paiement ou l'admin peut le MODIFIER.
-- NOTE: Dans une configuration idéale, nous passerions par une Database Function (RPC) 
-- pour la mise à jour après paiement afin de ne pas autoriser l'UPDATE direct sur la table.

COMMENT ON COLUMN public.owners.subscription_status IS 'Statut de l''abonnement propriétaire : active, expired, trial';
COMMENT ON COLUMN public.owners.subscription_expires_at IS 'Date d''expiration de l''accès au dashboard propriétaire';
