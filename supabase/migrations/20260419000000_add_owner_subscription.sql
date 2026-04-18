-- Migration : Ajout de la gestion d'abonnement propriétaires
-- 10 000 FCFA / mois avec 1 mois gratuit par défaut

ALTER TABLE public.owners 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 month');

-- Index pour la performance des filtres de dashboard
CREATE INDEX IF NOT EXISTS idx_owners_subscription_status ON public.owners(subscription_status);
CREATE INDEX IF NOT EXISTS idx_owners_subscription_expires ON public.owners(subscription_expires_at);

-- Commentaire pour la documentation
COMMENT ON COLUMN public.owners.subscription_status IS 'Statut de l''abonnement propriétaire : active, expired, none';
COMMENT ON COLUMN public.owners.subscription_expires_at IS 'Date d''expiration de l''accès au dashboard propriétaire';
