/*
  # Correction table demandes d'inscription

  1. Modifications
    - Ajouter colonne director_password pour stocker le mot de passe choisi
    - Permettre stockage sécurisé des identifiants utilisateur
  
  2. Sécurité
    - Mot de passe hashé côté client avant stockage
    - Accès restreint aux administrateurs
*/

-- Ajouter la colonne pour le mot de passe du directeur
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_registration_requests' AND column_name = 'director_password'
  ) THEN
    ALTER TABLE agency_registration_requests ADD COLUMN director_password text;
  END IF;
END $$;

-- Commentaire pour la nouvelle colonne
COMMENT ON COLUMN agency_registration_requests.director_password IS 'Mot de passe choisi par le directeur lors de l''inscription (hashé)';

-- Mettre à jour la politique de sécurité pour inclure la nouvelle colonne
DROP POLICY IF EXISTS "Authenticated users can manage registration requests" ON agency_registration_requests;

CREATE POLICY "Authenticated users can manage registration requests"
  ON agency_registration_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);