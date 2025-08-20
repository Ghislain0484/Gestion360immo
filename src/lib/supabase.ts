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

// Normalisations simples
const normalizeOwner = (o: any) => ({
  first_name: o.firstName ?? o.first_name ?? null,
  last_name:  o.lastName  ?? o.last_name  ?? null,
  phone:      o.phone     ?? null,
  email:      o.email     ?? null,
  city:       o.city      ?? null,
  ...o,
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
  title: p.title ?? p.propertyTitle ?? null,
  city:  p.city ?? null,
  ...p,
});

// Helper pour formatter proprement les erreurs Supabase
function formatSbError(prefix: string, error: any) {
  const parts = [prefix];
  if (error?.code) parts.push(`code=${error.code}`);
  if (error?.message) parts.push(`msg=${error.message}`);
  if (error?.details) parts.push(`details=${error.details}`);
  if (error?.hint) parts.push(`hint=${error.hint}`);
  return parts.join(' | ');
}

export const dbService = {
  // ---- READ (RLS-only: pas de filtre agency côté client) ----
  async getOwners() {
    const { data, error } = await supabase.from('owners').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async getTenants() {
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async getProperties() {
    const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async getContracts() {
    const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // ---- CREATE (⚠️ pas de .select() pour éviter un échec si SELECT RLS manquante) ----
  async createOwner(owner: any) {
    const payload = normalizeOwner(owner);
    console.log('🔄 PRODUCTION - Création propriétaire (payload):', payload);
    const { error } = await supabase.from('owners').insert(payload); // pas de .select()
    if (error) {
      const msg = formatSbError('❌ owners.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Propriétaire créé');
    return true;
  },

  async createTenant(tenant: any) {
    const payload = normalizeTenant(tenant);
    console.log('🔄 PRODUCTION - Création locataire (payload):', payload);
    const { error } = await supabase.from('tenants').insert(payload);
    if (error) {
      const msg = formatSbError('❌ tenants.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Locataire créé');
    return true;
  },

  async createProperty(property: any) {
    const payload = normalizeProperty(property);
    console.log('🔄 PRODUCTION - Création propriété (payload):', payload);
    const { error } = await supabase.from('properties').insert(payload);
    if (error) {
      const msg = formatSbError('❌ properties.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Propriété créée');
    return true;
  },

  async createContract(contract: any) {
    const payload = { ...contract };
    console.log('🔄 PRODUCTION - Création contrat (payload):', payload);
    const { error } = await supabase.from('contracts').insert(payload);
    if (error) {
      const msg = formatSbError('❌ contracts.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Contrat créé');
    return true;
  },

  // ---- DELETE ----
  async deleteOwner(id: string) {
    const { error } = await supabase.from('owners').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ owners.delete', error));
    return true;
  },
  async deleteTenant(id: string) {
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ tenants.delete', error));
    return true;
  },
  async deleteProperty(id: string) {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ properties.delete', error));
    return true;
  },
  async deleteContract(id: string) {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ contracts.delete', error));
    return true;
  },
};
