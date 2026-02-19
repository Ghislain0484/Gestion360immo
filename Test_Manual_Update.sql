-- Test manuel de mise à jour d'une agence
-- Remplacez 'VOTRE_AGENCY_ID' par un vrai ID d'agence

-- 1. Vérifier l'état actuel
SELECT 
    id,
    name,
    subscription_status,
    plan_type,
    monthly_fee
FROM agencies
WHERE id = '97abcd66-16c8-4f68-a066-2a5ce18ea8c0'  -- Remplacez par votre ID
LIMIT 1;

-- 2. Tester la mise à jour
UPDATE agencies 
SET subscription_status = 'suspended'
WHERE id = '97abcd66-16c8-4f68-a066-2a5ce18ea8c0'  -- Remplacez par votre ID
RETURNING 
    id,
    name,
    subscription_status,
    plan_type,
    monthly_fee;

-- 3. Vérifier que ça a fonctionné
SELECT 
    id,
    name,
    subscription_status,
    plan_type,
    monthly_fee
FROM agencies
WHERE id = '97abcd66-16c8-4f68-a066-2a5ce18ea8c0'  -- Remplacez par votre ID
LIMIT 1;

-- 4. Remettre en active
UPDATE agencies 
SET subscription_status = 'active'
WHERE id = '97abcd66-16c8-4f68-a066-2a5ce18ea8c0'  -- Remplacez par votre ID
RETURNING 
    id,
    name,
    subscription_status,
    plan_type,
    monthly_fee;
