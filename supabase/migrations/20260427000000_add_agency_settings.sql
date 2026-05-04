-- Ajout de la colonne settings sur la table agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"allow_data_deletion": false}'::jsonb;

-- Mettre à jour les agences existantes
UPDATE agencies SET settings = '{"allow_data_deletion": false}'::jsonb WHERE settings IS NULL;

-- Notifier PostgREST pour recharger le cache
NOTIFY pgrst, 'reload schema';
