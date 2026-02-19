-- =====================================================
-- Script de Diagnostic - Génération de Quittances
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor pour diagnostiquer les problèmes

-- 1. Vérifier la structure de la table rent_receipts
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rent_receipts'
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes et clés étrangères
-- =====================================================
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'rent_receipts';

-- 3. Vérifier les politiques RLS (Row Level Security)
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'rent_receipts';

-- 4. Vérifier les contrats actifs avec toutes leurs relations
-- =====================================================
SELECT 
    c.id as contract_id,
    c.status,
    c.agency_id,
    c.tenant_id,
    c.property_id,
    c.owner_id,
    c.monthly_rent,
    t.first_name || ' ' || t.last_name as tenant_name,
    p.title as property_title,
    o.first_name || ' ' || o.last_name as owner_name,
    a.name as agency_name
FROM contracts c
LEFT JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN properties p ON c.property_id = p.id
LEFT JOIN owners o ON c.owner_id = o.id
LEFT JOIN agencies a ON c.agency_id = a.id
WHERE c.status = 'active'
ORDER BY c.created_at DESC
LIMIT 10;

-- 5. Vérifier les quittances existantes
-- =====================================================
SELECT 
    rr.id,
    rr.receipt_number,
    rr.period_month,
    rr.period_year,
    rr.rent_amount,
    rr.total_amount,
    rr.payment_date,
    rr.created_at,
    t.first_name || ' ' || t.last_name as tenant_name
FROM rent_receipts rr
LEFT JOIN contracts c ON rr.contract_id = c.id
LEFT JOIN tenants t ON c.tenant_id = t.id
ORDER BY rr.created_at DESC
LIMIT 10;

-- 6. Vérifier les utilisateurs et leurs agences
-- =====================================================
SELECT 
    u.id as user_id,
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    au.agency_id,
    au.role,
    a.name as agency_name
FROM users u
LEFT JOIN agency_users au ON u.id = au.user_id
LEFT JOIN agencies a ON au.agency_id = a.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. Test d'insertion (COMMENTÉ - Décommentez pour tester)
-- =====================================================
-- IMPORTANT: Remplacez les valeurs par de vraies données de votre base
/*
INSERT INTO rent_receipts (
    id,
    receipt_number,
    contract_id,
    period_month,
    period_year,
    rent_amount,
    charges,
    total_amount,
    commission_amount,
    owner_payment,
    payment_date,
    payment_method,
    issued_by,
    created_at
) VALUES (
    gen_random_uuid(),
    'TEST-' || extract(epoch from now())::text,
    'REMPLACER_PAR_CONTRACT_ID', -- Prenez un ID de la requête #4
    2, -- Février
    2026,
    50000,
    5000,
    55000,
    0,
    55000,
    '2026-02-04',
    'especes',
    'REMPLACER_PAR_USER_ID', -- Prenez un ID de la requête #6
    now()
)
RETURNING *;
*/

-- 8. Vérifier les erreurs récentes dans les logs (si activés)
-- =====================================================
-- Note: Cette requête ne fonctionnera que si vous avez activé les logs Supabase
/*
SELECT 
    timestamp,
    event_message,
    metadata
FROM postgres_logs
WHERE event_message ILIKE '%rent_receipts%'
ORDER BY timestamp DESC
LIMIT 20;
*/

-- 9. Statistiques sur les quittances
-- =====================================================
SELECT 
    COUNT(*) as total_receipts,
    COUNT(DISTINCT contract_id) as unique_contracts,
    MIN(created_at) as first_receipt,
    MAX(created_at) as last_receipt,
    SUM(total_amount) as total_collected
FROM rent_receipts;

-- 10. Vérifier les contrats sans quittances
-- =====================================================
SELECT 
    c.id as contract_id,
    c.status,
    t.first_name || ' ' || t.last_name as tenant_name,
    p.title as property_title,
    c.monthly_rent,
    c.start_date,
    COUNT(rr.id) as receipt_count
FROM contracts c
LEFT JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN properties p ON c.property_id = p.id
LEFT JOIN rent_receipts rr ON c.id = rr.contract_id
WHERE c.status = 'active'
GROUP BY c.id, c.status, t.first_name, t.last_name, p.title, c.monthly_rent, c.start_date
HAVING COUNT(rr.id) = 0
ORDER BY c.created_at DESC;
