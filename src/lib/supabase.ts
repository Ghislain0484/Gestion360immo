// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error('❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants');
<<<<<<< HEAD
}

console.log('🔧 Configuration Supabase PRODUCTION:', {
  url,
  keyLength: anonKey?.length ?? 0,
  environment: 'production',
});

export const supabase: SupabaseClient = createClient(url, anonKey);
console.log('✅ Client Supabase créé avec succès');

// -------- utils --------
const nilIfEmpty = (v: any) => (v === '' || v === undefined ? null : v);

const normalizeOwner = (o: any) => ({
  first_name:     nilIfEmpty(o.firstName ?? o.first_name),
  last_name:      nilIfEmpty(o.lastName  ?? o.last_name),
  phone:          nilIfEmpty(o.phone),
  email:          nilIfEmpty(o.email),
  city:           nilIfEmpty(o.city),
  marital_status: nilIfEmpty(o.maritalStatus ?? o.marital_status),
});

const normalizeTenant = (t: any) => ({
  first_name: nilIfEmpty(t.firstName ?? t.first_name),
  last_name:  nilIfEmpty(t.lastName  ?? t.last_name),
  phone:      nilIfEmpty(t.phone),
  email:      nilIfEmpty(t.email),
  city:       nilIfEmpty(t.city),
});

const normalizeProperty = (p: any) => ({
  title: nilIfEmpty(p.title ?? p.propertyTitle),
  city:  nilIfEmpty(p.city),
});

function formatSbError(prefix: string, error: any) {
  const parts = [prefix];
  if (error?.code) parts.push(`code=${error.code}`);
  if (error?.message) parts.push(`msg=${error.message}`);
  if (error?.details) parts.push(`details=${error.details}`);
  if (error?.hint) parts.push(`hint=${error.hint}`);
  return parts.join(' | ');
}

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

function isRlsDenied(err: any): boolean {
  const code = err?.code || '';
  const msg = (err?.message || '').toLowerCase();
  return code === '42501' || msg.includes('row-level security') || msg.includes('permission denied');
}

// -------- fallback API (Service Role côté serveur) --------
async function createOwnerViaApi(cleanOwner: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const secret = import.meta.env.VITE_DEMO_SHARED_SECRET as string | undefined;

  if (!secret) throw new Error('fallback_disabled: VITE_DEMO_SHARED_SECRET manquant');

  const resp = await fetch('/api/owners/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 🔒 ce secret doit correspondre à DEMO_SHARED_SECRET défini dans Vercel (server)
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      owner: cleanOwner,
      userEmail: user?.email ?? null,
      userId: user?.id ?? null,
    }),
  });

  if (!resp.ok) {
    let out = 'fallback_api_failed';
    try { const j = await resp.json(); out = j.error || out; } catch {}
    throw new Error(out);
  }

  return await resp.json(); // renvoie la ligne owner insérée
}

=======
}

console.log('🔧 Configuration Supabase PRODUCTION:', {
  url,
  keyLength: anonKey?.length ?? 0,
  environment: 'production',
});

export const supabase: SupabaseClient = createClient(url, anonKey);
console.log('✅ Client Supabase créé avec succès');

// -------- utils --------
const nilIfEmpty = (v: any) => (v === '' || v === undefined ? null : v);

const normalizeOwner = (o: any) => ({
  first_name:     nilIfEmpty(o.firstName ?? o.first_name),
  last_name:      nilIfEmpty(o.lastName  ?? o.last_name),
  phone:          nilIfEmpty(o.phone),
  email:          nilIfEmpty(o.email),
  city:           nilIfEmpty(o.city),
  marital_status: nilIfEmpty(o.maritalStatus ?? o.marital_status),
});

const normalizeTenant = (t: any) => ({
  first_name: nilIfEmpty(t.firstName ?? t.first_name),
  last_name:  nilIfEmpty(t.lastName  ?? t.last_name),
  phone:      nilIfEmpty(t.phone),
  email:      nilIfEmpty(t.email),
  city:       nilIfEmpty(t.city),
});

const normalizeProperty = (p: any) => ({
  title: nilIfEmpty(p.title ?? p.propertyTitle),
  city:  nilIfEmpty(p.city),
});

function formatSbError(prefix: string, error: any) {
  const parts = [prefix];
  if (error?.code) parts.push(`code=${error.code}`);
  if (error?.message) parts.push(`msg=${error.message}`);
  if (error?.details) parts.push(`details=${error.details}`);
  if (error?.hint) parts.push(`hint=${error.hint}`);
  return parts.join(' | ');
}

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

function isRlsDenied(err: any): boolean {
  const code = err?.code || '';
  const msg = (err?.message || '').toLowerCase();
  return code === '42501' || msg.includes('row-level security') || msg.includes('permission denied');
}

// -------- fallback API (Service Role côté serveur) --------
async function createOwnerViaApi(cleanOwner: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const secret = import.meta.env.VITE_DEMO_SHARED_SECRET as string | undefined;

  if (!secret) throw new Error('fallback_disabled: VITE_DEMO_SHARED_SECRET manquant');

  const resp = await fetch('/api/owners/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 🔒 ce secret doit correspondre à DEMO_SHARED_SECRET défini dans Vercel (server)
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      owner: cleanOwner,
      userEmail: user?.email ?? null,
      userId: user?.id ?? null,
    }),
  });

  if (!resp.ok) {
    let out = 'fallback_api_failed';
    try { const j = await resp.json(); out = j.error || out; } catch {}
    throw new Error(out);
  }

  return await resp.json();
}

// ---------- CONSTANTES ----------
const LOCAL_STORAGE_KEY = "agency_registration_requests";

// ======================================================
// ================   DB SERVICE   ======================
// ======================================================
>>>>>>> 12fe85b (chore: ensure App.tsx single declaration)
export const dbService = {
  // ---------- AGENCY REGISTRATION (utilisé par AgencyRegistration.tsx) ----------
  async createRegistrationRequest(req: any) {
    await logAuthContext('agency_registration_requests.insert');

    // Nettoyage/normalisation des champs attendus par la table
    const clean = {
      agency_name:          nilIfEmpty(req.agency_name),
      commercial_register:  nilIfEmpty(req.commercial_register),
      director_first_name:  nilIfEmpty(req.director_first_name),
      director_last_name:   nilIfEmpty(req.director_last_name),
      director_email:       nilIfEmpty(req.director_email),
      phone:                nilIfEmpty(req.phone),
      city:                 nilIfEmpty(req.city),
      address:              nilIfEmpty(req.address),
      logo_url:             nilIfEmpty(req.logo_url),
      is_accredited:        !!req.is_accredited,
      accreditation_number: nilIfEmpty(req.accreditation_number),
      status:               req.status ?? 'pending',
      // created_at: laissé au DEFAULT côté DB si présent
    };

    console.log('🔄 PRODUCTION - Création demande agence (payload):', clean);

<<<<<<< HEAD
    // On n’appelle PAS .select('*') si la RLS peut bloquer ; on récupère juste l’id si possible.
    const { data, error } = await supabase
      .from('agency_registration_requests')
      .insert(clean)
      .select('id')
      .maybeSingle();

    if (error) {
      console.warn('⚠️ createRegistrationRequest RAW:', error);
      throw error; // L’appelant gère le fallback localStorage
    }

    const id = data?.id ?? null;
    console.log('✅ Demande agence créée id:', id);
    return { id };
=======
    try {
      const { data, error } = await supabase
        .from('agency_registration_requests')
        .insert(clean)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      const id = data?.id ?? null;
      console.log('✅ Demande agence créée id:', id);
      return { id };
    } catch (error) {
      console.warn('⚠️ createRegistrationRequest échoué, fallback localStorage:', error);
      // ---- fallback localStorage ----
      const localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      const localId = `local_${Date.now()}`;
      localRequests.push({ ...clean, id: localId, created_at: new Date().toISOString() });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localRequests));
      return { id: localId, local: true };
    }
  },

  // Synchronisation des enregistrements locaux → Supabase
  async syncLocalRequests(onSync?: (msg: string, success: boolean) => void) {
    const localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    if (!localRequests.length) return;

    for (const req of localRequests) {
      try {
        const { error } = await supabase
          .from("agency_registration_requests")
          .insert(req);

        if (error) throw error;

        // suppression de la requête locale
        const updated = localRequests.filter((r: any) => r.id !== req.id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

        onSync?.("✅ Synchronisation réussie avec le serveur", true);
      } catch (err) {
        console.error("⛔ Échec synchro:", err);
        onSync?.("⚠️ Erreur de synchro : certaines données restent en local", false);
      }
    }
>>>>>>> 12fe85b (chore: ensure App.tsx single declaration)
  },

  // ---------- READ (RLS-only) ----------
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
  async createOwner(owner: any) {
    await logAuthContext('owners.insert');

    // ⚠️ on ne transmet JAMAIS agency_id depuis le front
    const norm = normalizeOwner(owner);
    const { agency_id: _a, agency: _b, agencyId: _c, ...clean } = { ...owner, ...norm };

    console.log('🔄 PRODUCTION - Création propriétaire (payload):', clean);

    // 1) tentative directe (si session + RLS OK)
    const { data: direct, error } = await supabase
      .from('owners')
      .insert(clean)
      .select('*')
      .single();

<<<<<<< HEAD
    if (!error && direct) {
      console.log('✅ Propriétaire créé (direct RLS)');
      return direct;
    }

    console.error('❌ owners.insert RAW:', error);
    if (!isRlsDenied(error)) {
      const msg = formatSbError('❌ owners.insert', error);
      console.error(msg);
      throw new Error(msg);
    }

    // 2) fallback via API (Service Role) + génération contrat OHADA côté serveur
    console.warn('↪️ RLS a bloqué, fallback /api/owners/create');
    const inserted = await createOwnerViaApi(clean);
    console.log('✅ Propriétaire créé via API:', inserted?.id);
    return inserted;
=======
    if (!error && direct) return direct;

    console.error('❌ owners.insert RAW:', error);
    if (!isRlsDenied(error)) throw new Error(formatSbError('❌ owners.insert', error));

    console.warn('↪️ RLS a bloqué, fallback API');
    return await createOwnerViaApi(clean);
>>>>>>> 12fe85b (chore: ensure App.tsx single declaration)
  },

  async createTenant(tenant: any) {
    await logAuthContext('tenants.insert');
    const norm = normalizeTenant(tenant);
    const { agency_id: _a, agency: _b, agencyId: _c, ...clean } = { ...tenant, ...norm };

    console.log('🔄 PRODUCTION - Création locataire (payload):', clean);
    const { error } = await supabase.from('tenants').insert(clean);
<<<<<<< HEAD
    if (error) {
      console.error('❌ tenants.insert RAW:', error);
      const msg = formatSbError('❌ tenants.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Locataire créé');
=======
    if (error) throw new Error(formatSbError('❌ tenants.insert', error));
>>>>>>> 12fe85b (chore: ensure App.tsx single declaration)
    return true;
  },

  async createProperty(property: any) {
    await logAuthContext('properties.insert');
    const norm = normalizeProperty(property);
    const { agency_id: _a, agency: _b, agencyId: _c, ...clean } = { ...property, ...norm };

    console.log('🔄 PRODUCTION - Création propriété (payload):', clean);
    const { error } = await supabase.from('properties').insert(clean);
<<<<<<< HEAD
    if (error) {
      console.error('❌ properties.insert RAW:', error);
      const msg = formatSbError('❌ properties.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Propriété créée');
=======
    if (error) throw new Error(formatSbError('❌ properties.insert', error));
>>>>>>> 12fe85b (chore: ensure App.tsx single declaration)
    return true;
  },

  async createContract(contract: any) {
    await logAuthContext('contracts.insert');
    const { agency_id: _a, agency: _b, agencyId: _c, ...clean } = { ...contract };

    console.log('🔄 PRODUCTION - Création contrat (payload):', clean);
    const { error } = await supabase.from('contracts').insert(clean);
<<<<<<< HEAD
    if (error) {
      console.error('❌ contracts.insert RAW:', error);
      const msg = formatSbError('❌ contracts.insert', error);
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ Contrat créé');
=======
    if (error) throw new Error(formatSbError('❌ contracts.insert', error));
>>>>>>> 12fe85b (chore: ensure App.tsx single declaration)
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
