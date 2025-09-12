import { supabase } from './config';

export function formatSbError(prefix: string, error: any) {
    const parts = [prefix];
    if (error?.code) parts.push(`code=${error.code}`);
    if (error?.message) parts.push(`msg=${error.message}`);
    return parts.join(" | ");
}

export async function logAuthContext(tag: string) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.warn(`🔑 ${tag} getSession error:`, error);
        return { user: null, token: null };
    }
    return { user: session?.user ?? null, token: session?.access_token ?? null };
}

export function isRlsDenied(err: any): boolean {
    const msg = (err?.message || "").toLowerCase();
    return err?.code === "42501" || msg.includes("row-level security");
}