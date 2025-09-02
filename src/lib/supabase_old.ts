import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PlatformAdmin } from "../types/admin";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// --- Helpers ---
const nilIfEmpty = (v: any) => (v === "" || v === undefined ? null : v);

const normalizeOwner = (o: any) => ({
  first_name: nilIfEmpty(o.firstName ?? o.first_name),
  last_name: nilIfEmpty(o.lastName ?? o.last_name),
  phone: nilIfEmpty(o.phone),
  email: nilIfEmpty(o.email),
  city: nilIfEmpty(o.city),
  marital_status: nilIfEmpty(o.maritalStatus ?? o.marital_status),
});

const normalizeTenant = (t: any) => ({
  first_name: nilIfEmpty(t.firstName ?? t.first_name),
  last_name: nilIfEmpty(t.lastName ?? t.last_name),
  phone: nilIfEmpty(t.phone),
  email: nilIfEmpty(t.email),
  city: nilIfEmpty(t.city),
});

const normalizeProperty = (p: any) => ({
  title: nilIfEmpty(p.title ?? p.propertyTitle),
  city: nilIfEmpty(p.city),
});

function formatSbError(prefix: string, error: any) {
  const parts = [prefix];
  if (error?.code) parts.push(`code=${error.code}`);
  if (error?.message) parts.push(`msg=${error.message}`);
  return parts.join(" | ");
}

async function logAuthContext(tag: string) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.warn(`🔑 ${tag} getSession error:`, error);
    return { user: null, token: null };
  }
  return { user: session?.user ?? null, token: session?.access_token ?? null };
}

function isRlsDenied(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return err?.code === "42501" || msg.includes("row-level security");
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
    try { const j = await resp.json(); out = j.error || out; } catch { }
    throw new Error(out);
  }

  return await resp.json();
}

async function approveAgencyRequestViaApi(requestId: string, agencyData: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const secret = import.meta.env.VITE_DEMO_SHARED_SECRET as string | undefined;

  if (!secret) throw new Error('fallback_disabled: VITE_DEMO_SHARED_SECRET manquant');

  const resp = await fetch('/api/agencies/approve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      requestId,
      agencyData,
      userEmail: user?.email ?? null,
      userId: user?.id ?? null,
    }),
  });

  if (!resp.ok) {
    let out = 'fallback_api_failed';
    try { const j = await resp.json(); out = j.error || out; } catch { }
    throw new Error(out);
  }

  return await resp.json();
}

// ======================================================
// ================   DB SERVICE   ======================
// ======================================================
export const dbService = {
  // ----------------- AGENCIES -----------------
  async createRegistrationRequest(req: any) {
    try {
      // Nettoyage des données
      const clean = {
        agency_name: nilIfEmpty(req.agency_name),
        commercial_register: nilIfEmpty(req.commercial_register),
        director_first_name: nilIfEmpty(req.director_first_name),
        director_last_name: nilIfEmpty(req.director_last_name),
        director_email: nilIfEmpty(req.director_email),
        phone: nilIfEmpty(req.phone),
        city: nilIfEmpty(req.city),
        address: nilIfEmpty(req.address),
        logo_url: nilIfEmpty(req.logo_url),
        is_accredited: !!req.is_accredited,
        accreditation_number: nilIfEmpty(req.accreditation_number),
        status: "pending", // forcer le statut à pending pour les demandes externes
      };

      // Insertion dans Supabase
      const { data, error } = await supabase
        .from('agency_registration_requests')
        .insert(clean)
        .select('id')
        .maybeSingle();

      if (error) {
        // Vérifie si c'est une erreur RLS
        if (isRlsDenied(error)) {
          throw new Error(
            "❌ Impossible d'envoyer la demande. Veuillez réessayer ou contacter le support."
          );
        }
        throw new Error(formatSbError("❌ agency_registration_requests.insert", error));
      }

      return { id: data?.id };
    } catch (err: any) {
      console.error("Erreur createRegistrationRequest:", err);
      throw err;
    }
  },

  // ----------------- PROPRIETAIRES / LOCATAIRES / BIENS / CONTRATS -----------------

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
    const { data, error } = await supabase.from("properties").select("*");
    if (error) throw error;
    return data ?? [];
  },

  async getContracts() {
    const { data, error } = await supabase.from("contracts").select("*");
    if (error) throw error;
    return data ?? [];
  },

  // --------------- From GAGOHI ---------------- \\


  async createOwner(owner: any) {
    await logAuthContext('owners.insert');

    const norm = normalizeOwner(owner);
    const { agency_id: _a, agency: _b, agencyId: _c, ...clean } = { ...owner, ...norm };

    console.log('🔄 PRODUCTION - Création propriétaire (payload):', clean);

    const { data: direct, error } = await supabase
      .from('owners')
      .insert(clean)
      .select('*')
      .single();

    if (!error && direct) return direct;

    console.error('❌ owners.insert RAW:', error);
    if (!isRlsDenied(error)) throw new Error(formatSbError('❌ owners.insert', error));

    console.warn('↪️ RLS a bloqué, fallback API');
    return await createOwnerViaApi(clean);
  },

  async createTenant(tenant: any) {
    await logAuthContext('tenants.insert');
    const norm = normalizeTenant(tenant);
    const { agency_id: _a, agency: _b, agencyId: _c, ...clean } = { ...tenant, ...norm };

    console.log('🔄 PRODUCTION - Création locataire (payload):', clean);
    const { error } = await supabase.from('tenants').insert(clean);
    if (error) throw new Error(formatSbError('❌ tenants.insert', error));
    return true;
  },

  async createProperty(property: any) {
    await logAuthContext('properties.insert');
    const norm = normalizeProperty(property);
    const { agency_id: _a, agency: _b, agencyId: _c, ...clean } = { ...property, ...norm };

    console.log('🔄 PRODUCTION - Création propriété (payload):', clean);
    const { error } = await supabase.from('properties').insert(clean);
    if (error) throw new Error(formatSbError('❌ properties.insert', error));
    return true;
  },

  async createContract(contract: any) {
    await logAuthContext('contracts.insert');
    const { agency_id: _a, agency: _b, agencyId: _c, ...clean } = { ...contract };

    console.log('🔄 PRODUCTION - Création contrat (payload):', clean);
    const { error } = await supabase.from('contracts').insert(clean);
    if (error) throw new Error(formatSbError('❌ contracts.insert', error));
    return true;
  },

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

  async getRecentAgencies(limit = 5) {
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async getSystemAlerts() {
    return [
      { type: "success", title: "Système OK", description: "Tous les services fonctionnent normalement" },
    ];
  },

  async getAllSubscriptions() {
    const { data, error } = await supabase
      .from('agencies')
      .select('id, name:name, plan_type, monthly_fee, status:subscription_status, last_payment_date, next_payment_date, total_paid, payment_history, trial_days_remaining')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async extendSubscription(agencyId: string, months: number) {
    const { user, token } = await logAuthContext("extendSubscription");

    if (!user || !token) {
      throw new Error(formatSbError('extendSubscription', { message: 'User not authenticated' }));
    }

    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData) {
      throw new Error(formatSbError('extendSubscription', { message: 'Admin profile not found' }));
    }

    const admin = adminData as PlatformAdmin;
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      throw new Error(formatSbError('extendSubscription', { message: 'Insufficient permissions: Admin role required' }));
    }

    try {
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('next_payment_date, payment_history, total_paid, monthly_fee')
        .eq('id', agencyId)
        .single();

      if (agencyError) throw agencyError;
      if (!agency) throw new Error('Agence introuvable');

      const nextPaymentDate = agency.next_payment_date
        ? new Date(agency.next_payment_date)
        : new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + months);

      const payment = {
        date: new Date().toISOString(),
        amount: agency.monthly_fee * months,
      };

      const updatedPaymentHistory = [...(agency.payment_history || []), payment];

      const { error: updateError } = await supabase
        .from('agencies')
        .update({
          next_payment_date: nextPaymentDate.toISOString(),
          payment_history: updatedPaymentHistory,
          total_paid: (agency.total_paid || 0) + payment.amount,
          subscription_status: 'active',
        })
        .eq('id', agencyId);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error("❌ extendSubscription:", err);
      throw new Error(formatSbError("extendSubscription", err));
    }
  },

  async suspendSubscription(agencyId: string, reason: string) {
    const { user, token } = await logAuthContext("suspendSubscription");

    if (!user || !token) {
      throw new Error(formatSbError('suspendSubscription', { message: 'User not authenticated' }));
    }

    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData) {
      throw new Error(formatSbError('suspendSubscription', { message: 'Admin profile not found' }));
    }

    const admin = adminData as PlatformAdmin;
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      throw new Error(formatSbError('suspendSubscription', { message: 'Insufficient permissions: Admin role required' }));
    }

    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          subscription_status: 'suspended',
          suspension_reason: reason,
        })
        .eq('id', agencyId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("❌ suspendSubscription:", err);
      throw new Error(formatSbError("suspendSubscription", err));
    }
  },

  async activateSubscription(agencyId: string) {
    const { user, token } = await logAuthContext("activateSubscription");

    if (!user || !token) {
      throw new Error(formatSbError('activateSubscription', { message: 'User not authenticated' }));
    }

    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData) {
      throw new Error(formatSbError('activateSubscription', { message: 'Admin profile not found' }));
    }

    const admin = adminData as PlatformAdmin;
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      throw new Error(formatSbError('activateSubscription', { message: 'Insufficient permissions: Admin role required' }));
    }

    try {
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('monthly_fee')
        .eq('id', agencyId)
        .single();

      if (agencyError) throw agencyError;
      if (!agency) throw new Error('Agence introuvable');

      const { error } = await supabase
        .from('agencies')
        .update({
          subscription_status: 'active',
          next_payment_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
          suspension_reason: null,
        })
        .eq('id', agencyId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("❌ activateSubscription:", err);
      throw new Error(formatSbError("activateSubscription", err));
    }
  },

  async approveAgencyRequest(requestId: string) {
    const { user, token } = await logAuthContext("approveAgencyRequest");

    if (!user || !token) {
      throw new Error(formatSbError('approveAgencyRequest', { message: 'Utilisateur non authentifié' }));
    }

    // Fetch admin profile from platform_admins table
    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData) {
      throw new Error(formatSbError('approveAgencyRequest', { message: 'Profil admin introuvable' }));
    }

    const admin = adminData as PlatformAdmin;
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      throw new Error(formatSbError('approveAgencyRequest', { message: 'Permissions insuffisantes : role Admin nécessaire' }));
    }

    try {
      // 1. Récupérer la demande
      const { data: req, error: reqErr } = await supabase
        .from("agency_registration_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();

      if (reqErr) throw reqErr;
      if (!req) throw new Error("Demande introuvable");

      // 2. Marquer comme approuvée
      const { error: updateError } = await supabase
        .from("agency_registration_requests")
        .update({ status: "approved", processed_by: user.id, processed_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // 3. Créer l’agence
      const agencyData = {
        name: req.agency_name,
        city: req.city,
        phone: req.phone,
        email: req.director_email,
        commercial_register: req.commercial_register,
        logo_url: req.logo_url,
        is_accredited: req.is_accredited,
        accreditation_number: req.accreditation_number,
        address: req.address,
        status: 'active',
        created_at: new Date().toISOString(),
        subscription_status: 'trial',
        plan_type: 'basic',
        monthly_fee: 0,
      };

      const { data: agency, error: agErr } = await supabase
        .from('agencies')
        .insert(agencyData)
        .select('id')
        .single();

      if (agErr) throw agErr;

      return { id: agency.id };
    } catch (err) {
      console.error("❌ approveAgencyRequestDirect:", err);
      throw new Error(formatSbError("approveAgencyRequestDirect", err));
    }
  },

  async rejectAgencyRequest(requestId: string) {
    const { user } = await logAuthContext("rejectAgencyRequest");
    if (!user) throw new Error("Non authentifié");

    const { data: admin } = await supabase
      .from("platform_admins")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!admin) throw new Error("Profil admin introuvable");

    await supabase
      .from("agency_registration_requests")
      .update({ status: "rejected", processed_by: user.id })
      .eq("id", requestId);

    return true;
  },

  async getRegistrationRequests() {
    const { data, error } = await supabase
      .from('agency_registration_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(formatSbError("❌ agency_registration_requests.select", error));
    return data ?? [];
  },

  async getAgencies() {
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(formatSbError("❌ agencies.select", error));
    return data ?? [];
  },
};