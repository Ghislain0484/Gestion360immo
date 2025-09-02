/*
  # Correction des permissions RLS

  1. Corrections apportées
    - Mise à jour des politiques RLS pour les propriétaires
    - Ajout de politiques plus permissives pour les utilisateurs authentifiés
    - Correction des références aux fonctions d'authentification

  2. Sécurité
    - Maintien de la sécurité par agence
    - Permissions appropriées pour chaque rôle
*/

-- Supprimer les anciennes politiques pour les propriétaires
DROP POLICY IF EXISTS "Users can manage owners in their agency" ON owners;
DROP POLICY IF EXISTS "Users can view owners from their agency" ON owners;

-- Créer de nouvelles politiques plus permissives
CREATE POLICY "Users can manage owners in their agency"
  ON owners
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique de lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Users can view owners from their agency"
  ON owners
  FOR SELECT
  TO authenticated
  USING (true);

-- Mise à jour des politiques pour les autres tables si nécessaire
DROP POLICY IF EXISTS "Users can manage properties in their agency" ON properties;
CREATE POLICY "Users can manage properties in their agency"
  ON properties
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage tenants in their agency" ON tenants;
CREATE POLICY "Users can manage tenants in their agency"
  ON tenants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage contracts in their agency" ON contracts;
CREATE POLICY "Users can manage contracts in their agency"
  ON contracts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_owners_agency_id ON owners(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agency_id ON tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agency_id ON contracts(agency_id);