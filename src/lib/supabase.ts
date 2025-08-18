import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const isProd = import.meta.env.MODE === 'production';
const allowDemo = !isProd;

if (!isConfigured && isProd) {
  // En production, on ne permet pas de tourner sans config
  // (évite le mode démo / données locales)
  console.error('❌ Supabase non configuré en production.');
}

export const supabase = isConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          apikey: supabaseAnonKey!,
          Authorization: `Bearer ${supabaseAnonKey!}`,
        },
      },
    })
  : null;

if (supabase) {
  console.log('✅ Client Supabase OK');
} else {
  console.warn('⚠️ Supabase non initialisé (mode/dev uniquement).');
}

type InsertResult<T> = { data: T | null; error: any | null };

export const dbService = {
  // OWNERS
  async createOwner(owner: any) {
    if (!supabase || !isConfigured) throw new Error('Supabase non configuré');
    if (!owner?.agency_id) throw new Error('agency_id manquant');
    if (!owner.first_name || !owner.last_name || !owner.phone) {
      throw new Error('Champs obligatoires manquants: first_name, last_name, phone');
    }
    const { data, error } = await supabase.from('owners').insert(owner).select().single();
    if (error) throw error;
    return data;
  },

  async getOwners(agencyId?: string) {
    if (!supabase || !isConfigured) throw new Error('Supabase non configuré');
    let query = supabase.from('owners').select('*');
    if (agencyId) query = query.eq('agency_id', agencyId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // TENANTS
  async createTenant(tenant: any) {
    if (!supabase || !isConfigured) throw new Error('Supabase non configuré');
    if (!tenant?.agency_id) throw new Error('agency_id manquant');
    const { data, error } = await supabase.from('tenants').insert(tenant).select().single();
    if (error) throw error;
    return data;
  },

  async getTenants(agencyId?: string) {
    if (!supabase || !isConfigured) throw new Error('Supabase non configuré');
    let query = supabase.from('tenants').select('*');
    if (agencyId) query = query.eq('agency_id', agencyId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // PROPERTIES
  async createProperty(property: any) {
    if (!supabase || !isConfigured) throw new Error('Supabase non configuré');
    if (!property?.agency_id) throw new Error('agency_id manquant');
    if (!property?.owner_id) throw new Error('owner_id manquant');
    const { data, error } = await supabase.from('properties').insert(property).select().single();
    if (error) throw error;
    return data;
  },

  async getProperties(agencyId?: string) {
    if (!supabase || !isConfigured) throw new Error('Supabase non configuré');
    let query = supabase.from('properties').select('*');
    if (agencyId) query = query.eq('agency_id', agencyId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // CONTRACTS
  async createContract(contract: any) {
    if (!supabase || !isConfigured) throw new Error('Supabase non configuré');
    if (!contract?.agency_id) throw new Error('agency_id manquant');
    if (!contract?.property_id) throw new Error('property_id manquant');
    if (!contract?.tenant_id && !contract?.owner_id) {
      throw new Error('tenant_id ou owner_id requis');
    }
    const { data, error } = await supabase.from('contracts').insert(contract).select().single();
    if (error) throw error;
    return data;
  },

  async getContracts(agencyId?: string) {
    if (!supabase || !isConfigured) throw new Error('Supabase non configuré');
    let query = supabase.from('contracts').select('*');
    if (agencyId) query = query.eq('agency_id', agencyId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // TEMPS RÉEL
  subscribeToChanges(table: string, callback: (payload: any) => void) {
    if (!supabase || !isConfigured) return { unsubscribe() {} };
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        callback(payload);
      })
      .subscribe();
  },

  unsubscribeFromChanges(subscription: any) {
    try {
      if (subscription?.unsubscribe) subscription.unsubscribe();
    } catch {}
  },
};
