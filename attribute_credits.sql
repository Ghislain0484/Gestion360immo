-- ==============================================================================
-- GESTION360 - ATTRIBUTION DE 2 CRÉDITS BONUS À TOUTES LES AGENCES
-- ==============================================================================

-- 1. S'assurer que toutes les agences existantes ont un portefeuille (wallet) créé
-- Si une agence n'a pas encore de portefeuille, on lui en crée un avec le nombre 
-- de crédits par défaut (3).
INSERT INTO public.agency_wallets (agency_id, bonus_credits)
SELECT id, 3
FROM public.agencies
ON CONFLICT (agency_id) DO NOTHING;

-- 2. Ajouter exactement 2 crédits bonus au portefeuille de chaque agence
UPDATE public.agency_wallets
SET bonus_credits = COALESCE(bonus_credits, 0) + 2;

-- 3. Afficher le statut mis à jour des crédits pour vérification
SELECT 
    a.name AS nom_agence,
    aw.bonus_credits AS credits_bonus_totaux,
    aw.balance AS solde_fcfa
FROM public.agency_wallets aw
JOIN public.agencies a ON a.id = aw.agency_id
ORDER BY a.name;
