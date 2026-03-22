export const IS_STANDALONE = import.meta.env.VITE_APP_MODE === 'standalone';
export const APP_NAME = IS_STANDALONE ? (import.meta.env.VITE_APP_TITLE || 'Gestion Immobilière') : 'Gestion360';
export const APP_EDITION = import.meta.env.VITE_APP_EDITION || 'full'; // 'standard' or 'full'

export const DISABLE_SUBSCRIPTIONS = import.meta.env.VITE_DISABLE_SUBSCRIPTIONS === 'true' || IS_STANDALONE;
export const HIDE_PLATFORM_ADMIN = import.meta.env.VITE_HIDE_PLATFORM_ADMIN === 'true' || IS_STANDALONE;

export const FORCED_STANDALONE_MODULES = ['base', 'hotel', 'residences', 'internal_mode'];

// ID unique pour le mode démo (UUID valide pour éviter les erreurs SQL)
export const DEMO_AGENCY_ID = '00000000-0000-0000-0000-000000000000';
