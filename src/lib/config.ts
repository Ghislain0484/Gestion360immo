import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
    throw new Error('Configuration Supabase manquante');
}

// --- CONFIGURATION SILENCIEUSE ET VERROUILLAGE UNIVERSEL ---
const silentStorage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => {
        try { localStorage.setItem(key, value); } catch (e) { /* silent */ }
    },
    removeItem: (key: string) => localStorage.removeItem(key),
};

// Hybrid Lock: fonctionne comme fonction ET comme objet pour parer à toute version de Gotrue
const universalNoopLock: any = (name: string, acquire: () => Promise<any>) => acquire();
universalNoopLock.acquire = (name: string, callback: () => Promise<any>) => callback();

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: silentStorage,
        storageKey: 'gb360-auth-v4', // NUKER SESSION
        flowType: 'pkce',
        lock: universalNoopLock,
        debug: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 2,
        },
        heartbeatIntervalMs: 60000,
    },
    global: {
        headers: {
            'x-application-name': 'gestion360',
        },
    },
});
/*
// Client anonyme pour uploads sans session
export const supabaseAnon: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: undefined, // Désactiver le stockage de session
    },
});*/
