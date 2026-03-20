-- =============================================================
-- GESTION360 : NETTOYAGE ET SÉPARATION DES DONNÉES (HOTEL VS RESIDENCES)
-- Ce script corrige le mélange des clients et des montants financiers.
-- =============================================================

-- 1. Ré-étiquetage des RÉSERVATIONS selon leur nature
UPDATE public.modular_bookings SET module_type = 'hotel' WHERE room_id IS NOT NULL;
UPDATE public.modular_bookings SET module_type = 'residences' WHERE residence_id IS NOT NULL;

-- 2. Ré-étiquetage des TRANSACTIONS selon leur réservation liée
-- Cela va corriger le montant de 25 000 FCFA (en renvoyant les 10 000 FCFA à l'Hôtel)
UPDATE public.modular_transactions 
SET module_type = 'hotel' 
WHERE related_id IN (SELECT id FROM public.modular_bookings WHERE room_id IS NOT NULL);

UPDATE public.modular_transactions 
SET module_type = 'residences' 
WHERE related_id IN (SELECT id FROM public.modular_bookings WHERE residence_id IS NOT NULL);

-- 3. Ré-étiquetage des CLIENTS selon leur activité RÉELLE
-- On marque comme 'hotel' ceux qui ont des réservations d'hôtel
UPDATE public.modular_clients 
SET module_type = 'hotel' 
WHERE id IN (SELECT client_id FROM public.modular_bookings WHERE room_id IS NOT NULL);

-- On marque comme 'residences' ceux qui ont des réservations de résidences
-- (Ceux qui ont les deux resteront en 'residences' ou selon le dernier update)
UPDATE public.modular_clients 
SET module_type = 'residences' 
WHERE id IN (SELECT client_id FROM public.modular_bookings WHERE residence_id IS NOT NULL);

-- 4. Sécurité supplémentaire pour les transactions manuelles
UPDATE public.modular_transactions 
SET module_type = 'residences' 
WHERE module_type IS NULL AND site_id IS NOT NULL;

SELECT 'Nettoyage et séparation terminés !' AS status;
