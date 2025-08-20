import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error('❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants');
}

console.log('🔧 Configuration Supabase PRODUCTION:', {
  url,
  keyLength: anonKey?.length ?? 0,
  environment: 'production',
});

export const supabase: SupabaseClient = createClient(url, anonKey);
console.log('✅ Client Supabase créé avec succès');

// Helpers simples pour normaliser les payloads (firstName -> first_name, etc.)
const normalizeOwner = (o: any) => ({
  first_name: o.firstName ?? o.first_name ?? null,
  last_name:  o.lastName  ?? o.last_name  ?? null,
  phone:      o.phone     ?? null,
  email:      o.email     ?? null,
  city:       o.city      ?? null,
  ...o, // garde les autres champs éventuels
});

const normalizeTenant = (t: any) => ({
  first_name: t.firstName ?? t.first_name ?? null,
  last_name:  t.lastName  ?? t.last_name  ?? null,
  phone:      t.phone     ?? null,
  email:      t.email     ?? null,
  city:       t.city      ?? null,
  ...t,
});

const normalizeProperty = (p: any) => ({
  title:      p.title ?? p.propertyTitle ?? null,
  city:       p.city  ?? null,
  // ajoute ici d'autres mappings si besoin
  ...p,
});

export const dbService = {
  // ---------- READ (RLS-only: pas de filtre agency côté client) ----------
  async getOwners() {
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getTenants() {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getProperties() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getContracts() {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // ---------- CREATE ----------
  // ⚠️ On ne met PAS agency_id ici : tes TRIGGERS SQL l’injectent automatiquement
  async createOwner(owner: any) {
    const payload = normalizeOwner(owner);
    console.log('🔄 PRODUCTION - Création propriétaire (payload):', payload);
    const { data, error } = await supabase
      .from('owners')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('❌ Erreur création propriétaire:', error);
      throw error;
    }
    return data;
  },

  async createTenant(tenant: any) {
    const payload = normalizeTenant(tenant);
    console.log('🔄 PRODUCTION - Création locataire (payload):', payload);
    const { data, error } = await supabase
      .from('tenants')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('❌ Erreur création locataire:', error);
      throw error;
    }
    return data;
  },

  async createProperty(property: any) {
    const payload = normalizeProperty(property);
    console.log('🔄 PRODUCTION - Création propriété (payload):', payload);
    const { data, error } = await supabase
      .from('properties')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('❌ Erreur création propriété:', error);
      throw error;
    }
    return data;
  },

  async createContract(contract: any) {
    const payload = { ...contract };
    console.log('🔄 PRODUCTION - Création contrat (payload):', payload);
    const { data, error } = await supabase
      .from('contracts')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('❌ Erreur création contrat:', error);
      throw error;
    }
    return data;
  },

  // ---------- DELETE ----------
  async deleteOwner(id: string) {
    const { error } = await supabase.from('owners').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async deleteTenant(id: string) {
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async deleteProperty(id: string) {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async deleteContract(id: string) {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
