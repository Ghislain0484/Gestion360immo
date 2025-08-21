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

// -------- util --------
const nilIfEmpty = (v: any) => (v === '' || v === undefined ? null : v);

// ⚠️ On retourne SEULEMENT les colonnes connues; pas de "...o" qui ramènerait agency_id
const normalizeOwner = (o: any) => ({
  first_name: nilIfEmpty(o.firstName ?? o.first_name),
  last_name:  nilIfEmpty(o.lastName  ?? o.last_name),
  phone:      nilIfEmpty(o.phone),
  email:      nilIfEmpty(o.email),
  city:       nilIfEmpty(o.city),
  marital_status: nilIfEmpty(o.maritalStatus ?? o.marital_status),
  // ajoute ici d'autres colonnes existantes de public.owners si besoin
});

const normalizeTenant = (t: any) => ({
  first_name: nilIfEmpty(t.firstName ?? t.first_name),
  last_name:  nilIfEmpty(t.lastName  ?? t.last_name),
  phone:      nilIfEmpty(t.phone),
  email:      nilIfEmpty(t.email),
  city:       nilIfEmpty(t.city),
  // autres colonnes réelles...
});

const normalizeProperty = (p: any) => ({
  title:      nilIfEmpty(p.title ?? p.propertyTitle),
  city:       nilIfEmpty(p.city),
  // autres colonnes réelles...
});

function formatSbError(prefix: string, error: any) {
  const parts = [prefix];
  if (error?.code) parts.push(`code=${error.code}`);
  if (error?.message) parts.push(`msg=${error.message}`);
  if (error?.details) parts.push(`details=${error.details}`);
  if (error?.hint) parts.push(`hint=${error.hint}`);
  return parts.join(' | ');
}

// Debug auth
async function logAuthContext(tag: string) {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn(`🔑 ${tag} auth.getSession error:`, error);
      return;
    }
    console.log(`🔑 ${tag} user:`, session?.user?.id ?? null, 'token?', !!session?.access_token);
  } catch (e) {
    console.warn(`🔑 ${tag} auth.getSession threw:`, e);
  }
}

export const dbService = {
  // ---------- READ (RLS-only) ----------
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

  // ---------- CREATE (⚠️ pas de .select()) ----------
  async createOwner(owner: any) {
    await logAuthContext('owners.insert');
    const norm = normalizeOwner(owner);
    // strip proactif de tout "agency_id" parasite
    const { agency_id: _drop1, agency: _drop2, agencyId: _drop3, ...clean } = { ...owner, ...norm };
    console.log('🔄 PRODUCTION - Création propriétaire (payload):', clean);
    const { error } = await supabase.from('owners').insert(clean);
    if (error) {
      console.error('❌ owners.insert RAW:', error);
      const msg = formatSbError('❌ owners.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Propriétaire créé');
    return true;
  },

  async createTenant(tenant: any) {
    await logAuthContext('tenants.insert');
    const norm = normalizeTenant(tenant);
    const { agency_id: _d1, agency: _d2, agencyId: _d3, ...clean } = { ...tenant, ...norm };
    console.log('🔄 PRODUCTION - Création locataire (payload):', clean);
    const { error } = await supabase.from('tenants').insert(clean);
    if (error) {
      console.error('❌ tenants.insert RAW:', error);
      const msg = formatSbError('❌ tenants.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Locataire créé');
    return true;
  },

  async createProperty(property: any) {
    await logAuthContext('properties.insert');
    const norm = normalizeProperty(property);
    const { agency_id: _d1, agency: _d2, agencyId: _d3, ...clean } = { ...property, ...norm };
    console.log('🔄 PRODUCTION - Création propriété (payload):', clean);
    const { error } = await supabase.from('properties').insert(clean);
    if (error) {
      console.error('❌ properties.insert RAW:', error);
      const msg = formatSbError('❌ properties.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Propriété créée');
    return true;
  },

  async createContract(contract: any) {
    await logAuthContext('contracts.insert');
    const { agency_id: _d1, agency: _d2, agencyId: _d3, ...clean } = { ...contract };
    console.log('🔄 PRODUCTION - Création contrat (payload):', clean);
    const { error } = await supabase.from('contracts').insert(clean);
    if (error) {
      console.error('❌ contracts.insert RAW:', error);
      const msg = formatSbError('❌ contracts.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Contrat créé');
    return true;
  },

  // ---------- DELETE ----------
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
