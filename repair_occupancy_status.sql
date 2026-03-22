-- REPARATION DE LA LOGIQUE D'OCCUPATION (Phase 20)
-- Ce script resynchronise la colonne 'is_available' de la table 'properties' 
-- avec l'état réel des contrats actifs.

-- 1. On remet tout à disponible par défaut
UPDATE properties SET is_available = true;

-- 2. On marque comme indisponibles/occupés les biens qui ont un contrat de location ACTIF
UPDATE properties 
SET is_available = false 
WHERE id IN (
    SELECT property_id 
    FROM contracts 
    WHERE status IN ('active', 'renewed') 
    AND type = 'location'
);

-- Note: Ce script peut être exécuté dans l'éditeur SQL de Supabase pour corriger 
-- les anomalies d'affichage (ex: Bien marqué vacant alors qu'il est occupé).
