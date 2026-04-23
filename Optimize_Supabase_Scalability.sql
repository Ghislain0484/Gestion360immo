-- SCRIPT D'OPTIMISATION SUPABASE POUR GESTION360 (MULTI-AGENCES)
-- Ce script ajoute des index pour la performance et nettoie les politiques RLS

-- 1. INDEXATION DES COLONNES AGENCY_ID (CRITIQUE POUR LA PERFORMANCE)
-- L'indexation permet à Supabase de trouver instantanément les données d'une agence précise sans scanner toute la base.

CREATE INDEX IF NOT EXISTS idx_owners_agency_id ON public.owners(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agency_id ON public.tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agency_id ON public.contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_rent_receipts_agency_id ON public.rent_receipts(agency_id);
CREATE INDEX IF NOT EXISTS idx_transactions_agency_id ON public.transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agency_id ON public.tickets(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_agency_id ON public.agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_documents_agency_id ON public.documents(agency_id);

-- 2. INDEXATION DES CLÉS ÉTRANGÈRES FRÉQUEMMENT UTILISÉES
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON public.contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_receipts_contract_id ON public.rent_receipts(contract_id);

-- 3. OPTIMISATION RLS : FONCTION DE VÉRIFICATION D'AGENCE
-- Au lieu de faire des jointures complexes dans chaque politique RLS, 
-- nous utilisons une fonction qui récupère l'agency_id de l'utilisateur connecté une seule fois.

CREATE OR REPLACE FUNCTION public.get_my_agency_id()
RETURNS uuid AS $$
  SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. OPTIMISATION AVANCÉE : UTILISATION DES METADATA JWT (RECOMMANDÉ)
-- Pour une performance maximale, au lieu de consulter la table agency_users à chaque fois, 
-- vous pouvez stocker l'agency_id directement dans les "user_metadata" lors de la connexion.
-- La politique devient alors ultra-rapide car elle ne fait AUCUNE requête SQL supplémentaire :
-- CREATE POLICY "Fast Agency Access" ON public.owners
-- USING (agency_id = (auth.jwt() -> 'user_metadata' ->> 'agency_id')::uuid);

-- 5. NETTOYAGE DES SUPPRESSIONS (SÉCURITÉ)
-- Activez toujours le CASCADE delete avec prudence, ou utilisez des triggers pour archiver.
-- Le script SafeDelete côté React est déjà optimisé pour nettoyer proprement.

-- 6. CONFIGURATION DU CONNECTION POOLING (CONSEIL)
-- Dans votre application, utilisez toujours le port 6543 (Supavisor) pour les connexions directes
-- si vous dépassez 20 agences actives simultanément.

COMMENT ON FUNCTION public.get_my_agency_id IS 'Récupère l agency_id de l utilisateur actuel pour optimiser les politiques RLS.';
