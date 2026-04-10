-- =============================================================================
-- GESTION360 - MIGRATION DES MISES À JOUR (V23.1)
-- À EXÉCUTER POUR METTRE À JOUR UNE BASE EXISTANTE SANS TOUT RÉÉCRIRE
-- =============================================================================

-- 1. Ajout des colonnes pour les paiements partiels (si manquantes)
DO $$ 
BEGIN
    -- amount_paid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_receipts' AND column_name='amount_paid') THEN
        ALTER TABLE public.rent_receipts ADD COLUMN amount_paid numeric DEFAULT 0;
    END IF;

    -- balance_due
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_receipts' AND column_name='balance_due') THEN
        ALTER TABLE public.rent_receipts ADD COLUMN balance_due numeric DEFAULT 0;
    END IF;

    -- payment_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_receipts' AND column_name='payment_status') THEN
        ALTER TABLE public.rent_receipts ADD COLUMN payment_status text DEFAULT 'paid';
    END IF;

    -- agency_id (Nécessaire pour RLS rapide)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_receipts' AND column_name='agency_id') THEN
        ALTER TABLE public.rent_receipts ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
        -- Remplissage initial basé sur le contrat
        UPDATE public.rent_receipts r SET agency_id = (SELECT agency_id FROM public.contracts c WHERE c.id = r.contract_id)
        WHERE agency_id IS NULL;
    END IF;
END $$;

-- 2. Vérification des tables manquantes (ex: financial_transactions si elle n'existait pas)
-- Note: Si financial_transactions est une table complexe, elle devrait être créée ici.
-- Je suppose qu'elle existe déjà puisque le code l'utilise, mais au cas où :
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.owners(id),
    entity_type TEXT,
    type TEXT,
    amount NUMERIC NOT NULL,
    description TEXT,
    category TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    property_id UUID REFERENCES public.properties(id),
    financial_statement_id UUID REFERENCES public.financial_statements(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mise à jour de l'énumération des rôles (si 'cashier' manque)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'agency_user_role' AND e.enumlabel = 'cashier') THEN
        ALTER TYPE public.agency_user_role ADD VALUE 'cashier';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Migration terminée avec succès.'; END $$;
