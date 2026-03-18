-- Correct subscription for Général Immobilier et Conseils SARL
-- Quotas: 100 properties, 73 tenants -> Requires Enterprise (100,000 FCFA)

DO $$
DECLARE
    v_agency_id UUID;
BEGIN
    -- Find the agency ID
    SELECT id INTO v_agency_id FROM agencies WHERE name ILIKE '%Général Immobilier%' LIMIT 1;
    
    IF v_agency_id IS NOT NULL THEN
        -- Update agencies table
        UPDATE agencies 
        SET 
            plan_type = 'enterprise',
            monthly_fee = 100000,
            subscription_status = 'active',
            updated_at = NOW()
        WHERE id = v_agency_id;
        
        -- Update or insert agency_subscriptions table
        INSERT INTO agency_subscriptions (
            agency_id, 
            plan_type, 
            status, 
            monthly_fee, 
            next_payment_date,
            updated_at
        )
        VALUES (
            v_agency_id,
            'enterprise',
            'active',
            100000,
            NOW() + INTERVAL '30 days',
            NOW()
        )
        ON CONFLICT (agency_id) DO UPDATE SET
            plan_type = EXCLUDED.plan_type,
            status = EXCLUDED.status,
            monthly_fee = EXCLUDED.monthly_fee,
            next_payment_date = EXCLUDED.next_payment_date,
            updated_at = EXCLUDED.updated_at;
            
        RAISE NOTICE 'Agency Général Immobilier updated to Enterprise successfully.';
    ELSE
        RAISE NOTICE 'Agency Général Immobilier not found.';
    END IF;
END $$;
