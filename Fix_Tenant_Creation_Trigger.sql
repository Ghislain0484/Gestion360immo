-- =========================================================
-- FIX: DÉBLOCAGE DE LA CRÉATION DES LOCATAIRES
-- =========================================================
-- Ce script supprime l'automatisme défectueux qui tentait 
-- de créer un contrat sans propriétaire associé.

-- 1. Supprimer le trigger sur la table tenants
DROP TRIGGER IF EXISTS trg_auto_lease_contract ON public.tenants;

-- 2. Supprimer la fonction associée
DROP FUNCTION IF EXISTS auto_generate_lease_contract();

-- NOTE: Le système utilisera désormais la logique de l'application 
-- (TenantsList.tsx) pour créer les contrats au moment où vous 
-- affectez un bien au locataire.
