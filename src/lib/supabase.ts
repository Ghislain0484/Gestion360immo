cat > src/lib/supabase.ts <<'TS'
import { createClient } from '@supabase/supabase-js';

// --- UUID guard helper (production-safe) ---
const isUuid = (v?: string | null): boolean => !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configuration Supabase PRODUCTION:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length,
  environment: import.meta.env.MODE
});

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-application-name': 'Gestion360immo'
      }
    }
  }
) : null;

if (supabase) {
  console.log('✅ Client Supabase créé avec succès');
} else {
  console.error('❌ Configuration Supabase manquante - vérifiez les variables d\'environnement');
}

// In production, never fallback to local demo data
const IS_PROD = import.meta.env.MODE === 'production';
const allowLocalFallback = !IS_PROD;

export const dbService = {
  // ---------- OWNERS ----------
  async getOwners(agencyId?: string) {
    // UUID guard for getOwners
    const __agencyId = (typeof agencyId !== 'undefined') ? (agencyId as any) : undefined;
    if (!isUuid(__agencyId)) {
      console.warn('getOwners: agencyId invalide ou absent; skip fetch');
      return [] as any;
    }

    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🔄 PRODUCTION - Récupération propriétaires pour agence:', agencyId);

    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur Supabase owners:', error);
      // En DEV uniquement : fallback local
      if (allowLocalFallback && (error.code === 'PGRST301' || /JWT|RLS|permission/i.test(error.message))) {
        console.log('🔄 Fallback sur données locales owners');
        const localKey = agencyId ? `demo_owners_${agencyId}` : 'demo_owners';
        const localData = JSON.parse(localStorage.getItem(localKey) || '[]');
        return localData;
      }
      throw error;
    }
    console.log('✅ owners chargés:', (data || []).length);
    return data;
  },

  async createOwner(owner: any) {
    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🔄 PRODUCTION - Création propriétaire:', owner);

    const { data, error } = await supabase
      .from('owners')
      .insert(owner)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création propriétaire:', error);
      throw error;
    }
    return data;
  },

  async updateOwner(id: string, updates: any) {
    console.log('🔄 PRODUCTION - Mise à jour propriétaire:', id);
    
    const { data, error } = await supabase
      .from('owners')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur mise à jour propriétaire:', error);
      throw error;
    }
    return data;
  },

  async deleteOwner(id: string) {
    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🗑️ PRODUCTION - Suppression propriétaire:', id);

    const { error } = await supabase
      .from('owners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erreur suppression propriétaire:', error);
      throw error;
    }
    return true;
  },

  // ---------- PROPERTIES ----------
  async getProperties(agencyId?: string) {
    // UUID guard for getProperties
    const __agencyId = (typeof agencyId !== 'undefined') ? (agencyId as any) : undefined;
    if (!isUuid(__agencyId)) {
      console.warn('getProperties: agencyId invalide ou absent; skip fetch');
      return [] as any;
    }

    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🔄 PRODUCTION - Récupération propriétés pour agence:', agencyId);

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur Supabase properties:', error);
      if (allowLocalFallback && (error.code === 'PGRST301' || /JWT|RLS|permission/i.test(error.message))) {
        console.log('🔄 Fallback sur données locales properties');
        const localKey = agencyId ? `demo_properties_${agencyId}` : 'demo_properties';
        const localData = JSON.parse(localStorage.getItem(localKey) || '[]');
        return localData;
      }
      throw error;
    }
    return data ?? [];
  },

  async createProperty(property: any) {
    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🔄 PRODUCTION - Création propriété:', property);

    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création propriété:', error);
      throw error;
    }
    return data;
  },

  async updateProperty(id: string, updates: any) {
    console.log('🔄 PRODUCTION - Mise à jour propriété:', id);

    const { data, error } = await supabase
      .from('properties')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur mise à jour propriété:', error);
      throw error;
    }
    return data;
  },

  async deleteProperty(id: string) {
    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🗑️ PRODUCTION - Suppression propriété:', id);

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erreur suppression propriété:', error);
      throw error;
    }
    return true;
  },

  // ---------- TENANTS ----------
  async getTenants(agencyId?: string) {
    // UUID guard for getTenants
    const __agencyId = (typeof agencyId !== 'undefined') ? (agencyId as any) : undefined;
    if (!isUuid(__agencyId)) {
      console.warn('getTenants: agencyId invalide ou absent; skip fetch');
      return [] as any;
    }

    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🔄 PRODUCTION - Récupération locataires pour agence:', agencyId);

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur Supabase tenants:', error);
      if (allowLocalFallback && (error.code === 'PGRST301' || /JWT|RLS|permission/i.test(error.message))) {
        console.log('🔄 Fallback sur données locales tenants');
        const localKey = agencyId ? `demo_tenants_${agencyId}` : 'demo_tenants';
        const localData = JSON.parse(localStorage.getItem(localKey) || '[]');
        return localData;
      }
      throw error;
    }
    return data ?? [];
  },

  async createTenant(tenant: any) {
    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🔄 PRODUCTION - Création locataire:', tenant);

    const { data, error } = await supabase
      .from('tenants')
      .insert(tenant)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création locataire:', error);
      throw error;
    }
    return data;
  },

  async updateTenant(id: string, updates: any) {
    console.log('🔄 PRODUCTION - Mise à jour locataire:', id);

    const { data, error } = await supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur mise à jour locataire:', error);
      throw error;
    }
    return data;
  },

  async deleteTenant(id: string) {
    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🗑️ PRODUCTION - Suppression locataire:', id);

    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erreur suppression locataire:', error);
      throw error;
    }
    return true;
  },

  // ---------- CONTRACTS ----------
  async getContracts(agencyId?: string) {
    // UUID guard for getContracts
    const __agencyId = (typeof agencyId !== 'undefined') ? (agencyId as any) : undefined;
    if (!isUuid(__agencyId)) {
      console.warn('getContracts: agencyId invalide ou absent; skip fetch');
      return [] as any;
    }

    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🔄 PRODUCTION - Récupération contrats pour agence:', agencyId);

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur Supabase contracts:', error);
      if (allowLocalFallback && (error.code === 'PGRST301' || /JWT|RLS|permission/i.test(error.message))) {
        console.log('🔄 Fallback sur données locales contracts');
        const localKey = agencyId ? `demo_contracts_${agencyId}` : 'demo_contracts';
        const localData = JSON.parse(localStorage.getItem(localKey) || '[]');
        return localData;
      }
      throw error;
    }
    return data ?? [];
  },

  async createContract(contract: any) {
    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🔄 PRODUCTION - Création contrat:', contract);

    const { data, error } = await supabase
      .from('contracts')
      .insert(contract)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création contrat:', error);
      throw error;
    }
    return data;
  },

  async updateContract(id: string, updates: any) {
    console.log('🔄 PRODUCTION - Mise à jour contrat:', id);

    const { data, error } = await supabase
      .from('contracts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur mise à jour contrat:', error);
      throw error;
    }
    return data;
  },

  async deleteContract(id: string) {
    if (!supabase) throw new Error('Supabase non configuré');
    console.log('🗑️ PRODUCTION - Suppression contrat:', id);

    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erreur suppression contrat:', error);
      throw error;
    }
    return true;
  },

  // ---------- USERS ----------
  async getUserProfileByAuthId(authUserId: string) {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${authUserId},auth_user_id.eq.${authUserId}`)
      .single();

    if (error) throw error;
    return data;
  },

  async createMinimalProfileFromSession(sessionUser: any) {
    if (!supabase) throw new Error('Supabase non configuré');
    const minimal = {
      id: sessionUser.id,
      auth_user_id: sessionUser.id,
      email: sessionUser.email,
      first_name: sessionUser.user_metadata?.first_name || 'Directeur',
      last_name: sessionUser.user_metadata?.last_name || '',
      role: 'director',
      agency_id: null,
    };
    const { data, error } = await supabase
      .from('users')
      .insert(minimal)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAppUserOnly(id: string) {
    if (!supabase) throw new Error('Supabase non configuré');
    // ⚠️ La suppression dans Auth nécessite une clé service côté serveur (API Vercel).
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
TS
