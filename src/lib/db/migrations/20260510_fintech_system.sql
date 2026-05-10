-- Tables pour le système de Wallet et Crédits (Fintech)

-- 1. Table des Portefeuilles des Agences
CREATE TABLE IF NOT EXISTS public.agency_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC DEFAULT 0, -- Montant en FCFA
    bonus_credits INTEGER DEFAULT 3, -- Nombre de crédits offerts
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des Transactions du Portefeuille
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'usage', 'bonus', 'referral_bonus', 'commission')),
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    description TEXT,
    reference TEXT, -- Référence externe (Flutterwave, etc.)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Initialisation des Wallets pour les agences existantes (avec 3 crédits bonus)
INSERT INTO public.agency_wallets (agency_id, bonus_credits)
SELECT id, 3 FROM public.agencies
ON CONFLICT (agency_id) DO NOTHING;

-- RLS Policies
ALTER TABLE public.agency_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Politique : Les directeurs peuvent voir leur propre wallet
CREATE POLICY "Directeurs voir leur propre wallet" ON public.agency_wallets
    FOR SELECT TO authenticated
    USING (agency_id IN (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Politique : Les directeurs peuvent voir leurs propres transactions
CREATE POLICY "Directeurs voir leurs propres transactions" ON public.wallet_transactions
    FOR SELECT TO authenticated
    USING (agency_id IN (SELECT agency_id FROM public.users WHERE id = auth.uid()));
