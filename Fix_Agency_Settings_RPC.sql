-- ============================================================
-- Fix: RPC pour mettre à jour les settings de l'agence
-- Contourne la RLS qui bloque le PATCH direct sur agencies
-- ============================================================

CREATE OR REPLACE FUNCTION update_agency_settings(
  p_agency_id UUID,
  p_settings JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur courant appartient à l'agence
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND agency_id = p_agency_id
    AND role IN ('director', 'agency_manager')
  ) THEN
    RAISE EXCEPTION 'Permission refusée : rôle insuffisant pour modifier les paramètres de cette agence';
  END IF;

  -- Mettre à jour les settings de l'agence
  UPDATE agencies
  SET 
    settings = COALESCE(settings, '{}'::jsonb) || p_settings,
    updated_at = NOW()
  WHERE id = p_agency_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agence non trouvée : %', p_agency_id;
  END IF;
END;
$$;

-- Accorder les droits d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION update_agency_settings(UUID, JSONB) TO authenticated;

-- Vérification
SELECT 'RPC update_agency_settings créée avec succès' AS status;
