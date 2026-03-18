export const IS_STANDALONE = import.meta.env.VITE_STANDALONE_MODE === 'true';
export const APP_NAME = IS_STANDALONE ? (import.meta.env.VITE_APP_NAME || 'Gestion Hotelière') : 'Gestion360';
export const APP_EDITION = import.meta.env.VITE_APP_EDITION || 'full'; // 'standard' or 'full'

export const FORCED_STANDALONE_MODULES = ['base', 'hotel', 'residences', 'internal_mode'];
