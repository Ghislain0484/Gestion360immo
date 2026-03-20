-- =============================================================
-- GESTION360 : NETTOYAGE CHIRURGICAL ET SÉPARATION STRICTE
-- Version 2 : Basée sur les mots-clés et les liens de réservation
-- =============================================================

-- 1. Ré-étiquetage des RÉSERVATIONS par nature
UPDATE public.modular_bookings SET module_type = 'hotel' WHERE room_id IS NOT NULL;
UPDATE public.modular_bookings SET module_type = 'residences' WHERE residence_id IS NOT NULL;

-- 2. Ré-étiquetage des TRANSACTIONS par mots-clés et liens
-- On envoie à l'Hôtel tout ce qui contient des termes liés à l'hôtellerie
UPDATE public.modular_transactions 
SET module_type = 'hotel' 
WHERE description ILIKE '%Hôtel%' 
   OR description ILIKE '%Hotel%' 
   OR description ILIKE '%Chambre%' 
   OR description ILIKE '%Room%';

-- On envoie aux Résidences tout ce qui contient des termes liés aux résidences
UPDATE public.modular_transactions 
SET module_type = 'residences' 
WHERE description ILIKE '%Résidence%' 
   OR description ILIKE '%Residence%';

-- Synchronisation par lien de réservation (prioritaire sur les mots-clés)
UPDATE public.modular_transactions 
SET module_type = 'hotel' 
WHERE related_id IN (SELECT id FROM public.modular_bookings WHERE room_id IS NOT NULL);

UPDATE public.modular_transactions 
SET module_type = 'residences' 
WHERE related_id IN (SELECT id FROM public.modular_bookings WHERE residence_id IS NOT NULL);

-- 3. Ré-étiquetage des CLIENTS (Strict)
-- On assigne chaque client au module où il a son activité la plus récente
WITH last_bookings AS (
    SELECT DISTINCT ON (client_id) client_id, module_type
    FROM public.modular_bookings
    ORDER BY client_id, created_at DESC
)
UPDATE public.modular_clients mc
SET module_type = lb.module_type
FROM last_bookings lb
WHERE mc.id = lb.client_id;

-- 4. Nettoyage des valeurs NULL restantes pour éviter les fuites de données
UPDATE public.modular_clients SET module_type = 'residences' WHERE module_type IS NULL;
UPDATE public.modular_transactions SET module_type = 'residences' WHERE module_type IS NULL;
UPDATE public.modular_bookings SET module_type = 'residences' WHERE module_type IS NULL;

SELECT 'Séparation chirurgicale terminée ! Le total devrait être correct maintenant.' AS status;
