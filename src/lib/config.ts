import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
    throw new Error('Configuration Supabase manquante');
}

// --- ISOLATION TOTALE (GHOST STORAGE) ---
// Empeche toute synchronisation en masquant l'identite du stockage
const ghostStorage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => {
        try { localStorage.setItem(key, value); } catch (e) {}
    },
    removeItem: (key: string) => localStorage.removeItem(key),
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: ghostStorage,
        storageKey: 'gb360-purge-ultimate', // FORCE REFRESH TOTAL
        flowType: 'pkce',
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
