-- ==============================================================================
-- MAINTENANCE FINALE RLS : ZÉRO BOUCLE INFINIE (APPROCHE ACYCLIQUE)
-- Ce script réactive le RLS de manière 100% sécurisée sur les tables clés.
-- À exécuter dans le SQL Editor de Supabase
-- ==============================================================================

-- --------------------------------------------------------
-- A. TABLE: agency_users
-- Règle d'or : On ne lit que sa propre ligne, ou le directeur lit son agence.
-- AUCUN APPEL À UNE FONCTION, AUCUNE SOUS-REQUÊTE RÉCURSIVE.
-- --------------------------------------------------------
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their agency users" ON public.agency_users;
DROP POLICY IF EXISTS "Users can read own agency users" ON public.agency_users;
CREATE POLICY "Users can read own agency users" ON public.agency_users
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Directors can manage their agency users" ON public.agency_users;
DROP POLICY IF EXISTS "Directors can manage agency users" ON public.agency_users;
CREATE POLICY "Directors can manage agency users" ON public.agency_users
FOR ALL TO authenticated
USING (
    agency_id IN (SELECT id FROM public.agencies WHERE director_id = auth.uid())
);


-- --------------------------------------------------------
-- B. TABLE: contracts
-- Accès Agence: Si le contrat appartient à une agence où l'utilisateur est présent.
-- Accès Proprio: Si le contrat est lié à une propriété appartenant à l'utilisateur.
-- --------------------------------------------------------
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency users can access contracts" ON public.contracts;
CREATE POLICY "Agency users can access contracts" ON public.contracts
FOR ALL TO authenticated
USING (
    agency_id IN (
        SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "owner_read_own_contracts" ON public.contracts;
CREATE POLICY "owner_read_own_contracts" ON public.contracts
FOR SELECT TO authenticated
USING (
    property_id IN (
        SELECT id FROM public.properties WHERE owner_id IN (
            SELECT id FROM public.owners WHERE user_id = auth.uid()
        )
    )
);


-- --------------------------------------------------------
-- C. TABLE: rent_receipts
-- Accès Agence: Si la quittance est liée à un contrat d'une agence de l'utilisateur.
-- Accès Proprio: Si la quittance est liée à un contrat d'une propriété de l'utilisateur.
-- --------------------------------------------------------
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency users can access receipts" ON public.rent_receipts;
CREATE POLICY "Agency users can access receipts" ON public.rent_receipts
FOR ALL TO authenticated
USING (
    contract_id IN (
        SELECT id FROM public.contracts WHERE agency_id IN (
            SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "owner_read_own_receipts" ON public.rent_receipts;
CREATE POLICY "owner_read_own_receipts" ON public.rent_receipts
FOR SELECT TO authenticated
USING (
    contract_id IN (
        SELECT id FROM public.contracts WHERE property_id IN (
            SELECT id FROM public.properties WHERE owner_id IN (
                SELECT id FROM public.owners WHERE user_id = auth.uid()
            )
        )
    )
);

SELECT '✅ RLS Acyclique activé avec succès. Aucune erreur 500 attendue.' as status;
