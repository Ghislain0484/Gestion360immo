-- ====================================================================
-- 💬 MIGRATION SQL - INTEGRATION SMS PRO ORANGE CI & MONETISATION SAAS
-- ====================================================================
-- A appliquer directement dans l'éditeur SQL de votre Dashboard Supabase
-- ====================================================================

-- 1. Ajout des colonnes de gestion SMS dans la table des agences (public.agencies)
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_expiry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_sender_name VARCHAR(11) DEFAULT 'G360Immo';

-- 2. Création de la table des forfaits SMS disponibles à la vente (public.sms_packages)
-- Tarifs fixés à 20 FCFA par SMS avec rollover Orange-style
CREATE TABLE IF NOT EXISTS public.sms_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,            -- ex. "Pack Standard"
    sms_count INTEGER NOT NULL,            -- ex. 100
    price_xof INTEGER NOT NULL,            -- ex. 2000 (20 FCFA / SMS)
    validity_days INTEGER NOT NULL,        -- ex. 30 (jours de validité)
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Création de la table de suivi des achats de SMS par les agences (public.sms_purchase_history)
CREATE TABLE IF NOT EXISTS public.sms_purchase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.sms_packages(id) ON DELETE SET NULL,
    amount_paid INTEGER NOT NULL,          -- Montant réglé en FCFA
    sms_added INTEGER NOT NULL,            -- Nombre de SMS crédités
    payment_gateway_ref VARCHAR(100),      -- Réf transaction Flutterwave (ex: transaction_id)
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    payment_method VARCHAR(50),            -- 'card', 'orange_money', 'wave', 'mtn_momo'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Création de la table du journal d'envoi des SMS (public.sms_logs)
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    sender_id UUID,                        -- ID de l'utilisateur initiateur
    recipient VARCHAR(20) NOT NULL,        -- Numéro au format international (+225...)
    message TEXT NOT NULL,
    sms_count_deducted INTEGER DEFAULT 1,  -- Nb de SMS décrémentés (taille du message)
    status VARCHAR(50) DEFAULT 'pending',  -- 'sent', 'failed'
    error_message TEXT,                    -- Détail de l'erreur si l'API Orange échoue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index pour optimiser les performances de recherche
CREATE INDEX IF NOT EXISTS idx_sms_logs_agency ON public.sms_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_sms_purchases_agency ON public.sms_purchase_history(agency_id);

-- 5. Pré-population des forfaits à 20 FCFA par SMS (Si vides)
INSERT INTO public.sms_packages (name, sms_count, price_xof, validity_days)
SELECT 'Pack Découverte', 20, 400, 7
WHERE NOT EXISTS (SELECT 1 FROM public.sms_packages WHERE name = 'Pack Découverte');

INSERT INTO public.sms_packages (name, sms_count, price_xof, validity_days)
SELECT 'Pack Standard', 100, 2000, 30
WHERE NOT EXISTS (SELECT 1 FROM public.sms_packages WHERE name = 'Pack Standard');

INSERT INTO public.sms_packages (name, sms_count, price_xof, validity_days)
SELECT 'Pack Pro', 1000, 20000, 45
WHERE NOT EXISTS (SELECT 1 FROM public.sms_packages WHERE name = 'Pack Pro');

INSERT INTO public.sms_packages (name, sms_count, price_xof, validity_days)
SELECT 'Pack Entreprise', 10000, 200000, 60
WHERE NOT EXISTS (SELECT 1 FROM public.sms_packages WHERE name = 'Pack Entreprise');

-- 6. Configuration de la Sécurité Row Level Security (RLS) et permissions
ALTER TABLE public.sms_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture publique des forfaits SMS
DROP POLICY IF EXISTS "Public select packages" ON public.sms_packages;
CREATE POLICY "Public select packages" ON public.sms_packages FOR SELECT USING (true);

-- RLS pour l'historique d'achat (lecture uniquement pour l'agence connectée)
DROP POLICY IF EXISTS "Agencies purchase history view" ON public.sms_purchase_history;
CREATE POLICY "Agencies purchase history view" ON public.sms_purchase_history FOR SELECT 
USING (
  agency_id::text = (SELECT raw_user_meta_data->>'agency_id' FROM auth.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Agencies purchase history insert" ON public.sms_purchase_history;
CREATE POLICY "Agencies purchase history insert" ON public.sms_purchase_history FOR INSERT
WITH CHECK (true);

-- RLS pour les journaux d'envoi SMS (lecture pour l'agence connectée)
DROP POLICY IF EXISTS "Agencies sms logs view" ON public.sms_logs;
CREATE POLICY "Agencies sms logs view" ON public.sms_logs FOR SELECT
USING (
  agency_id::text = (SELECT raw_user_meta_data->>'agency_id' FROM auth.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Agencies sms logs insert" ON public.sms_logs;
CREATE POLICY "Agencies sms logs insert" ON public.sms_logs FOR INSERT
WITH CHECK (true);

-- Attribution des permissions d'accès aux tables
GRANT ALL PRIVILEGES ON TABLE public.sms_packages TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.sms_purchase_history TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.sms_logs TO postgres, anon, authenticated, service_role;
