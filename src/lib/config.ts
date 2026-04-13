import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
    throw new Error('Configuration Supabase manquante');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        // DO NOT use a custom storageKey — the default is fine, and custom keys
        // cause @supabase/auth-js to create a BroadcastChannel named
        // 'tabs:<storageKey>:outgoing.message.ready' that has no listener,
        // producing the "No Listener: tabs:outgoing.message.ready" crash.
        // storageKey: 'supabase.auth.token',  <-- REMOVED
        broadcast: false, // EXTREMELY CRITICAL: Prevents "No Listener: tabs:outgoing.message.ready" from crashing Vite
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
