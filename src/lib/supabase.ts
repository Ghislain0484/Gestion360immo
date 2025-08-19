// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
if (!supabaseUrl || !supabaseAnonKey) {
  // Aide au debug build/prod
  // eslint-disable-next-line no-console
  console.warn('⚠️ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper typé
async function fromTable<T>(table: string, builder: (q: any) => any): Promise<T[]> {
  const { data, error } = await builder(supabase.from(table));
  if (error) throw error;
  return (data ?? []) as T[];
}

// --------- ADMIN DB SERVICE ---------
export const dbService = {
  // KPIs Admin (haut de page)
  async getPlatformStats() {
    const [agenciesApproved, pending, subs] = await Promise.all([
      fromTable<any>('agencies', q => q.select('id', { count: 'exact', head: false }).eq('status', 'approved')),
      fromTable<any>('agency_registration_requests', q => q.select('id').eq('status', 'pending')),
      fromTable<any>('subscriptions', q => q.select('id')),
    ]);
    return {
      agenciesApproved: agenciesApproved.length,
      agenciesPending: pending.length,
      subscriptions: subs.length,
    };
  },

  // Demandes d’agence en attente
  async getPendingAgencyRequests() {
    return await fromTable<any>('agency_registration_requests', q =>
      q.select('*').eq('status', 'pending').order('created_at', { ascending: true })
    );
  },

  // Approbation (via RPC si la fonction existe)
  async approveAgencyRequest(requestId: string) {
    // 1) Essai via RPC (recommandé)
    const { data, error } = await supabase.rpc('approve_agency_request', { p_request_id: requestId });
    if (!error) return data;

    // 2) Fallback minimal: passer la demande en "approved"
    // ⚠️ Ce fallback n’insère PAS l’agence/agency_users (préférez créer la RPC côté SQL).
    const res = await supabase
      .from('agency_registration_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)
      .select()
      .single();
    if (res.error) throw res.error;
    return res.data;
  },

  async rejectAgencyRequest(requestId: string, reason?: string) {
    const { data, error } = await supabase
      .from('agency_registration_requests')
      .update({ status: 'rejected', rejection_reason: reason ?? null })
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Agences filtrées par statut (utilisé dans AgencyManagement)
  async getAgenciesByStatus(status: 'pending' | 'approved' | 'rejected') {
    return await fromTable<any>('agencies', q =>
      q.select('*').eq('status', status).order('created_at', { ascending: false })
    );
  },

  // Abonnements (utilisé dans SubscriptionManagement)
  async getAllSubscriptions() {
    return await fromTable<any>('subscriptions', q =>
      q.select('*').order('created_at', { ascending: false })
    );
  },

  // Création de demande (utilisé par AgencyRegistration)
  async createRegistrationRequest(payload: any) {
    const { data, error } = await supabase
      .from('agency_registration_requests')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    return data;
  },
};
