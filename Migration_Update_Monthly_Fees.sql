-- Migration pour mettre à jour les frais mensuels selon le plan
-- Date: 2026-02-07

-- Mise à jour des frais mensuels selon le plan_type
UPDATE agencies 
SET monthly_fee = CASE 
    WHEN plan_type = 'basic' THEN 15000
    WHEN plan_type = 'premium' THEN 25000
    WHEN plan_type = 'enterprise' THEN 50000
    ELSE 15000
END
WHERE monthly_fee = 0 OR monthly_fee IS NULL;

-- Vérification finale
SELECT 
    COUNT(*) as total_agencies,
    COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_agencies,
    COUNT(CASE WHEN plan_type = 'basic' THEN 1 END) as basic_plan,
    COUNT(CASE WHEN plan_type = 'premium' THEN 1 END) as premium_plan,
    COUNT(CASE WHEN plan_type = 'enterprise' THEN 1 END) as enterprise_plan,
    SUM(monthly_fee) as total_monthly_revenue
FROM agencies;

-- Liste détaillée
SELECT 
    name,
    subscription_status,
    plan_type,
    monthly_fee,
    created_at
FROM agencies
ORDER BY created_at DESC;
