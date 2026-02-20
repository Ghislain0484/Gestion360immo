-- ============================================================
-- SCRIPT DE RÉINITIALISATION — Gestion360
-- Supprime toutes les données opérationnelles en conservant :
--   ✅ agencies
--   ✅ agency_users
--   ✅ users (comptes de connexion)
--   ✅ agency_subscriptions
--   ✅ platform_admins
--   ✅ platform_settings
--   ✅ agency_registration_requests
-- ============================================================
-- ⚠️  ATTENTION : Cette opération est IRRÉVERSIBLE.
--     Faites une sauvegarde (backup) Supabase avant d'exécuter.
-- ============================================================

BEGIN;

-- 1. Supprimer les reçus de loyer (dépendent des contrats)
DELETE FROM public.rent_receipts;

-- 2. Supprimer les états financiers
DELETE FROM public.financial_statements;

-- 3. Supprimer les contrats (dépendent des propriétés, propriétaires, locataires)
DELETE FROM public.contracts;

-- 4. Supprimer les intérêts d'annonces
DELETE FROM public.announcement_interests;

-- 5. Supprimer les annonces (dépendent des propriétés)
DELETE FROM public.announcements;

-- 6. Supprimer les propriétés (dépendent des propriétaires)
DELETE FROM public.properties;

-- 7. Supprimer les locataires
DELETE FROM public.tenants;

-- 8. Supprimer les propriétaires
DELETE FROM public.owners;

-- 9. Supprimer les messages
DELETE FROM public.messages;

-- 10. Supprimer les notifications
DELETE FROM public.notifications;

-- 11. Supprimer les paiements d'abonnement (optionnel — décommenter si souhaité)
-- DELETE FROM public.subscription_payments;

-- 12. Supprimer les classements agence (optionnel — décommenter si souhaité)
-- DELETE FROM public.agency_rankings;

-- 13. Réinitialiser les inventaires si la table existe
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventories') THEN
    DELETE FROM public.inventories;
  END IF;
END $$;

-- Vérification finale : afficher ce qui reste
SELECT 'agencies'           AS table_name, COUNT(*) AS remaining FROM public.agencies
UNION ALL
SELECT 'agency_users',       COUNT(*) FROM public.agency_users
UNION ALL
SELECT 'users',              COUNT(*) FROM public.users
UNION ALL
SELECT 'agency_subscriptions', COUNT(*) FROM public.agency_subscriptions
UNION ALL
SELECT 'owners',             COUNT(*) FROM public.owners
UNION ALL
SELECT 'tenants',            COUNT(*) FROM public.tenants
UNION ALL
SELECT 'properties',         COUNT(*) FROM public.properties
UNION ALL
SELECT 'contracts',          COUNT(*) FROM public.contracts
UNION ALL
SELECT 'rent_receipts',      COUNT(*) FROM public.rent_receipts
UNION ALL
SELECT 'announcements',      COUNT(*) FROM public.announcements
UNION ALL
SELECT 'messages',           COUNT(*) FROM public.messages
UNION ALL
SELECT 'notifications',      COUNT(*) FROM public.notifications
ORDER BY table_name;

COMMIT;
