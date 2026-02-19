-- Mise à jour des prix d'abonnement à 25000 FCFA minimum
-- Date: 2026-02-07

-- Mettre à jour tous les abonnements Basic à 25000 FCFA
UPDATE agencies 
SET monthly_fee = 25000
WHERE plan_type = 'basic' AND monthly_fee < 25000;

-- Vérifier les nouveaux prix
SELECT 
    name,
    plan_type,
    monthly_fee,
    subscription_status
FROM agencies
ORDER BY created_at DESC;

-- Résumé des revenus
SELECT 
    plan_type,
    COUNT(*) as nombre_agences,
    SUM(monthly_fee) as revenus_mensuels
FROM agencies
WHERE subscription_status = 'active'
GROUP BY plan_type;
