-- ==============================================================================
-- FIX FINTECH SCHEMA FORCE - RÉPARATION ET PERMISSIONS
-- ==============================================================================

-- 1. Réparation des tables au cas où elles manqueraient
CREATE TABLE IF NOT EXISTS public.agency_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) DEFAULT 0,
  bonus_credits INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'deposit', 'usage', 'platform_fee', 'commission'
  description TEXT,
  reference VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Attribution des permissions (CRUCIAL POUR L'AFFICHAGE FRONTEND)
GRANT ALL ON public.agency_wallets TO authenticated, anon, service_role;
GRANT ALL ON public.wallet_transactions TO authenticated, anon, service_role;

-- 3. Rafraîchissement du cache du schéma (FORCE POSTGREST RELOAD)
NOTIFY pgrst, 'reload schema';

SELECT '✅ Permissions fintech accordées et cache schéma rafraîchi.' as status;
