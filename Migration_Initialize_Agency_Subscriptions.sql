-- Migration pour ajouter et initialiser les colonnes subscription_status et plan_type
-- Date: 2026-02-07

-- Étape 1: Ajouter les colonnes si elles n'existent pas
DO $$ 
BEGIN
    -- Ajouter subscription_status si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agencies' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE agencies 
        ADD COLUMN subscription_status TEXT DEFAULT 'active';
    END IF;

    -- Ajouter plan_type si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agencies' AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE agencies 
        ADD COLUMN plan_type TEXT DEFAULT 'basic';
    END IF;

    -- Ajouter monthly_fee si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agencies' AND column_name = 'monthly_fee'
    ) THEN
        ALTER TABLE agencies 
        ADD COLUMN monthly_fee NUMERIC(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Étape 2: Mettre à jour les agences existantes avec des valeurs par défaut
UPDATE agencies 
SET 
    subscription_status = COALESCE(subscription_status, 'active'),
    plan_type = COALESCE(plan_type, 'premium'),
    monthly_fee = COALESCE(monthly_fee, 
        CASE 
            WHEN plan_type = 'basic' THEN 15000
            WHEN plan_type = 'premium' THEN 25000
            WHEN plan_type = 'enterprise' THEN 50000
            ELSE 25000
        END
    )
WHERE subscription_status IS NULL 
   OR plan_type IS NULL 
   OR monthly_fee IS NULL;

-- Étape 3: Ajouter des contraintes
ALTER TABLE agencies 
    ALTER COLUMN subscription_status SET NOT NULL,
    ALTER COLUMN plan_type SET NOT NULL,
    ALTER COLUMN monthly_fee SET NOT NULL;

-- Étape 4: Ajouter des contraintes de vérification
DO $$ 
BEGIN
    -- Contrainte pour subscription_status
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'agencies_subscription_status_check'
    ) THEN
        ALTER TABLE agencies 
        ADD CONSTRAINT agencies_subscription_status_check 
        CHECK (subscription_status IN ('active', 'suspended', 'trial', 'cancelled'));
    END IF;

    -- Contrainte pour plan_type
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'agencies_plan_type_check'
    ) THEN
        ALTER TABLE agencies 
        ADD CONSTRAINT agencies_plan_type_check 
        CHECK (plan_type IN ('basic', 'premium', 'enterprise'));
    END IF;
END $$;

-- Vérification
SELECT 
    id,
    name,
    subscription_status,
    plan_type,
    monthly_fee,
    created_at
FROM agencies
ORDER BY created_at DESC
LIMIT 10;
