import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification de la configuration Supabase
const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  supabaseUrl.includes('.supabase.co') &&
  supabaseUrl !== 'https://votre-projet.supabase.co' && 
  supabaseAnonKey.startsWith('eyJ') &&
  supabaseAnonKey.length > 100 &&
  !supabaseAnonKey.includes('...')
);

console.log('🔧 Configuration Supabase:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlValid: supabaseUrl?.startsWith('https://') && supabaseUrl?.includes('.supabase.co'),
  keyValid: supabaseAnonKey?.startsWith('eyJ') && supabaseAnonKey?.length > 100,
  isConfigured: isSupabaseConfigured,
  environment: import.meta.env.MODE,
  url: supabaseUrl?.substring(0, 30) + '...',
  keyStart: supabaseAnonKey?.substring(0, 20) + '...'
});

// Créer le client Supabase avec fallback
export const supabase = (() => {
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase non configuré - Mode démo activé');
    return null;
  }
  
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    
    console.log('✅ Client Supabase créé avec succès');
    return client;
  } catch (error) {
    console.error('❌ Erreur création client Supabase:', error);
    return null;
  }
})();

// Générateur d'ID unique pour le mode démo
const generateId = () => `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Stockage local pour le mode démo
const demoStorage = {
  owners: 'demo_owners',
  tenants: 'demo_tenants',
  properties: 'demo_properties',
  contracts: 'demo_contracts',
  agencies: 'demo_agencies',
};

// Helper function pour opérations base de données avec fallback démo
const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  demoFallback?: () => T
): Promise<T> => {
  console.log(`🔄 ${operationName} - Tentative...`);
  
  // Si Supabase n'est pas configuré, utiliser le mode démo
  if (!supabase || !isSupabaseConfigured) {
    console.warn(`⚠️ ${operationName} - Mode démo (Supabase non configuré)`);
    if (demoFallback) {
      return demoFallback();
    }
    throw new Error('Mode démo - Fonctionnalité non disponible');
  }
  
  try {
    const result = await operation();
    console.log(`✅ ${operationName} - Succès en base de données`);
    return result;
  } catch (error: any) {
    console.error(`❌ ${operationName} - Erreur:`, error);
    
    // Si erreur API key, basculer en mode démo
    if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
      console.warn(`🔄 ${operationName} - Basculement mode démo suite erreur API`);
      if (demoFallback) {
        return demoFallback();
      }
      throw new Error('Configuration Supabase invalide - Mode démo activé');
    }
    
    throw error;
  }
};

// Database service functions avec fallback démo complet
export const dbService = {
  // Owners
  async createOwner(owner: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('owners')
          .insert(owner)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'createOwner',
      () => {
        const newOwner = { ...owner, id: generateId(), created_at: new Date().toISOString() };
        const stored = JSON.parse(localStorage.getItem(demoStorage.owners) || '[]');
        stored.unshift(newOwner);
        localStorage.setItem(demoStorage.owners, JSON.stringify(stored));
        return newOwner;
      }
    );
  },

  async getOwners(agencyId?: string) {
    return await safeDbOperation(
      async () => {
        let query = supabase!.from('owners').select('*');
        if (agencyId) {
          query = query.eq('agency_id', agencyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      'getOwners',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.owners) || '[]');
        return agencyId ? stored.filter((o: any) => o.agency_id === agencyId) : stored;
      }
    );
  },

  async updateOwner(id: string, updates: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('owners')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateOwner',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.owners) || '[]');
        const index = stored.findIndex((o: any) => o.id === id);
        if (index !== -1) {
          stored[index] = { ...stored[index], ...updates, updated_at: new Date().toISOString() };
          localStorage.setItem(demoStorage.owners, JSON.stringify(stored));
          return stored[index];
        }
        throw new Error('Propriétaire non trouvé');
      }
    );
  },

  async deleteOwner(id: string) {
    return await safeDbOperation(
      async () => {
        const { error } = await supabase!.from('owners').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      'deleteOwner',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.owners) || '[]');
        const filtered = stored.filter((o: any) => o.id !== id);
        localStorage.setItem(demoStorage.owners, JSON.stringify(filtered));
        return { success: true };
      }
    );
  },

  // Tenants
  async createTenant(tenant: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('tenants')
          .insert(tenant)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'createTenant',
      () => {
        const newTenant = { ...tenant, id: generateId(), created_at: new Date().toISOString() };
        const stored = JSON.parse(localStorage.getItem(demoStorage.tenants) || '[]');
        stored.unshift(newTenant);
        localStorage.setItem(demoStorage.tenants, JSON.stringify(stored));
        return newTenant;
      }
    );
  },

  async getTenants(agencyId?: string) {
    return await safeDbOperation(
      async () => {
        let query = supabase!.from('tenants').select('*');
        if (agencyId) {
          query = query.eq('agency_id', agencyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      'getTenants',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.tenants) || '[]');
        return agencyId ? stored.filter((t: any) => t.agency_id === agencyId) : stored;
      }
    );
  },

  async updateTenant(id: string, updates: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('tenants')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateTenant',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.tenants) || '[]');
        const index = stored.findIndex((t: any) => t.id === id);
        if (index !== -1) {
          stored[index] = { ...stored[index], ...updates, updated_at: new Date().toISOString() };
          localStorage.setItem(demoStorage.tenants, JSON.stringify(stored));
          return stored[index];
        }
        throw new Error('Locataire non trouvé');
      }
    );
  },

  async deleteTenant(id: string) {
    return await safeDbOperation(
      async () => {
        const { error } = await supabase!.from('tenants').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      'deleteTenant',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.tenants) || '[]');
        const filtered = stored.filter((t: any) => t.id !== id);
        localStorage.setItem(demoStorage.tenants, JSON.stringify(filtered));
        return { success: true };
      }
    );
  },

  // Properties
  async createProperty(property: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('properties')
          .insert(property)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'createProperty',
      () => {
        const newProperty = { ...property, id: generateId(), created_at: new Date().toISOString() };
        const stored = JSON.parse(localStorage.getItem(demoStorage.properties) || '[]');
        stored.unshift(newProperty);
        localStorage.setItem(demoStorage.properties, JSON.stringify(stored));
        return newProperty;
      }
    );
  },

  async getProperties(agencyId?: string) {
    return await safeDbOperation(
      async () => {
        let query = supabase!.from('properties').select(`
          *,
          owners(first_name, last_name)
        `);
        if (agencyId) {
          query = query.eq('agency_id', agencyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      'getProperties',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.properties) || '[]');
        return agencyId ? stored.filter((p: any) => p.agency_id === agencyId) : stored;
      }
    );
  },

  async updateProperty(id: string, updates: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('properties')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateProperty',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.properties) || '[]');
        const index = stored.findIndex((p: any) => p.id === id);
        if (index !== -1) {
          stored[index] = { ...stored[index], ...updates, updated_at: new Date().toISOString() };
          localStorage.setItem(demoStorage.properties, JSON.stringify(stored));
          return stored[index];
        }
        throw new Error('Propriété non trouvée');
      }
    );
  },

  async deleteProperty(id: string) {
    return await safeDbOperation(
      async () => {
        const { error } = await supabase!.from('properties').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      'deleteProperty',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.properties) || '[]');
        const filtered = stored.filter((p: any) => p.id !== id);
        localStorage.setItem(demoStorage.properties, JSON.stringify(filtered));
        return { success: true };
      }
    );
  },

  // Contracts
  async createContract(contract: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('contracts')
          .insert(contract)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'createContract',
      () => {
        const newContract = { ...contract, id: generateId(), created_at: new Date().toISOString() };
        const stored = JSON.parse(localStorage.getItem(demoStorage.contracts) || '[]');
        stored.unshift(newContract);
        localStorage.setItem(demoStorage.contracts, JSON.stringify(stored));
        return newContract;
      }
    );
  },

  async getContracts(agencyId?: string) {
    return await safeDbOperation(
      async () => {
        let query = supabase!.from('contracts').select(`
          *,
          properties(title),
          owners(first_name, last_name),
          tenants(first_name, last_name)
        `);
        if (agencyId) {
          query = query.eq('agency_id', agencyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      'getContracts',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.contracts) || '[]');
        return agencyId ? stored.filter((c: any) => c.agency_id === agencyId) : stored;
      }
    );
  },

  async updateContract(id: string, updates: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('contracts')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateContract',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.contracts) || '[]');
        const index = stored.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          stored[index] = { ...stored[index], ...updates, updated_at: new Date().toISOString() };
          localStorage.setItem(demoStorage.contracts, JSON.stringify(stored));
          return stored[index];
        }
        throw new Error('Contrat non trouvé');
      }
    );
  },

  async deleteContract(id: string) {
    return await safeDbOperation(
      async () => {
        const { error } = await supabase!.from('contracts').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      'deleteContract',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.contracts) || '[]');
        const filtered = stored.filter((c: any) => c.id !== id);
        localStorage.setItem(demoStorage.contracts, JSON.stringify(filtered));
        return { success: true };
      }
    );
  },

  // Agency
  async getAgency(id: string) {
    return await safeDbOperation(
      async () => {
        if (!id) throw new Error('ID agence manquant');
        
        const { data, error } = await supabase!
          .from('agencies')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data;
      },
      'getAgency',
      () => {
        // Données d'agence démo
        return {
          id: id,
          name: 'Immobilier Excellence (Démo)',
          commercial_register: 'CI-ABJ-2024-B-12345',
          address: 'Abidjan, Côte d\'Ivoire',
          phone: '+225 01 02 03 04 05',
          email: 'contact@agence-demo.com',
          created_at: new Date().toISOString()
        };
      }
    );
  },

  // Dashboard stats avec fallback démo
  async getDashboardStats(agencyId: string) {
    return await safeDbOperation(
      async () => {
        if (!agencyId) throw new Error('Agency ID manquant');
        
        const [propertiesResult, ownersResult, tenantsResult, contractsResult] = await Promise.all([
          supabase!.from('properties').select('id', { count: 'exact' }).eq('agency_id', agencyId),
          supabase!.from('owners').select('id', { count: 'exact' }).eq('agency_id', agencyId),
          supabase!.from('tenants').select('id', { count: 'exact' }).eq('agency_id', agencyId),
          supabase!.from('contracts').select('id, monthly_rent, status', { count: 'exact' }).eq('agency_id', agencyId)
        ]);

        if (propertiesResult.error) throw propertiesResult.error;
        if (ownersResult.error) throw ownersResult.error;
        if (tenantsResult.error) throw tenantsResult.error;
        if (contractsResult.error) throw contractsResult.error;

        const activeContracts = contractsResult.data?.filter(c => c.status === 'active') || [];
        const monthlyRevenue = activeContracts.reduce((sum, c) => sum + (c.monthly_rent || 0), 0);
        const totalProperties = propertiesResult.count || 0;
        const occupancyRate = totalProperties > 0 ? (activeContracts.length / totalProperties) * 100 : 0;

        return {
          totalProperties: propertiesResult.count || 0,
          totalOwners: ownersResult.count || 0,
          totalTenants: tenantsResult.count || 0,
          totalContracts: contractsResult.count || 0,
          monthlyRevenue,
          activeContracts: activeContracts.length,
          occupancyRate: Math.round(occupancyRate * 10) / 10
        };
      },
      'getDashboardStats',
      () => {
        const owners = JSON.parse(localStorage.getItem(demoStorage.owners) || '[]');
        const tenants = JSON.parse(localStorage.getItem(demoStorage.tenants) || '[]');
        const properties = JSON.parse(localStorage.getItem(demoStorage.properties) || '[]');
        const contracts = JSON.parse(localStorage.getItem(demoStorage.contracts) || '[]');
        
        const agencyOwners = owners.filter((o: any) => o.agency_id === agencyId);
        const agencyTenants = tenants.filter((t: any) => t.agency_id === agencyId);
        const agencyProperties = properties.filter((p: any) => p.agency_id === agencyId);
        const agencyContracts = contracts.filter((c: any) => c.agency_id === agencyId);
        
        const activeContracts = agencyContracts.filter((c: any) => c.status === 'active');
        const monthlyRevenue = activeContracts.reduce((sum: number, c: any) => sum + (c.monthly_rent || 350000), 0);
        const occupancyRate = agencyProperties.length > 0 ? (activeContracts.length / agencyProperties.length) * 100 : 0;

        return {
          totalProperties: agencyProperties.length,
          totalOwners: agencyOwners.length,
          totalTenants: agencyTenants.length,
          totalContracts: agencyContracts.length,
          monthlyRevenue,
          activeContracts: activeContracts.length,
          occupancyRate: Math.round(occupancyRate * 10) / 10
        };
      }
    );
  },

  // Registration requests
  async createRegistrationRequest(request: any) {
    return await safeDbOperation(
      async () => {
        console.log('🔄 Création demande inscription en base:', request);
        const { data, error } = await supabase!
          .from('agency_registration_requests')
          .insert({
            agency_name: request.agency_name,
            commercial_register: request.commercial_register,
            director_first_name: request.director_first_name,
            director_last_name: request.director_last_name,
            director_email: request.director_email,
            director_password: request.director_password,
            phone: request.phone,
            city: request.city,
            address: request.address,
            logo_url: request.logo_url,
            is_accredited: request.is_accredited || false,
            accreditation_number: request.accreditation_number,
            status: 'pending'
          })
          .select()
          .single();
        if (error) throw error;
        console.log('✅ Demande créée en base avec ID:', data.id);
        return data;
      },
      'createRegistrationRequest',
      () => {
        const newRequest = { 
          ...request, 
          id: generateId(), 
          created_at: new Date().toISOString(),
          status: 'pending'
        };
        const stored = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        stored.unshift(newRequest);
        localStorage.setItem('demo_registration_requests', JSON.stringify(stored));
        console.log('✅ Demande sauvegardée localement avec ID:', newRequest.id);
        return newRequest;
      }
    );
  },

  async getRegistrationRequests() {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('agency_registration_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      'getRegistrationRequests',
      () => {
        return JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      }
    );
  },

  async updateRegistrationRequest(id: string, updates: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('agency_registration_requests')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateRegistrationRequest',
      () => {
        const stored = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        const index = stored.findIndex((r: any) => r.id === id);
        if (index !== -1) {
          stored[index] = { ...stored[index], ...updates };
          localStorage.setItem('demo_registration_requests', JSON.stringify(stored));
          return stored[index];
        }
        throw new Error('Demande non trouvée');
      }
    );
  },

  // Admin functions
  async getAllAgencies() {
    return await safeDbOperation(
      async () => {
        const [agenciesResult, subscriptionsResult] = await Promise.all([
          supabase!.from('agencies').select('*').order('created_at', { ascending: false }),
          supabase!.from('agency_subscriptions').select('agency_id, plan_type, status, monthly_fee, next_payment_date')
        ]);

        if (agenciesResult.error) throw agenciesResult.error;
        if (subscriptionsResult.error) throw subscriptionsResult.error;

        const agencies = agenciesResult.data || [];
        const subscriptions = subscriptionsResult.data || [];

        return agencies.map((agency: any) => {
          const subscription = subscriptions.find((sub: any) => sub.agency_id === agency.id);
          return {
            ...agency,
            subscription_status: subscription?.status || 'trial',
            plan_type: subscription?.plan_type || 'basic',
            monthly_fee: subscription?.monthly_fee || 25000,
            next_payment_date: subscription?.next_payment_date,
          };
        });
      },
      'getAllAgencies',
      () => {
        return [
          {
            id: 'demo_agency_1',
            name: 'Immobilier Excellence (Démo)',
            commercial_register: 'CI-ABJ-2024-B-12345',
            city: 'Abidjan',
            email: 'contact@demo.com',
            phone: '+225 01 02 03 04 05',
            subscription_status: 'active',
            plan_type: 'premium',
            monthly_fee: 50000,
            created_at: new Date().toISOString()
          }
        ];
      }
    );
  },

  async getAllSubscriptions() {
    return await safeDbOperation(
      async () => {
        const [subscriptionsResult, agenciesResult] = await Promise.all([
          supabase!.from('agency_subscriptions').select('*').order('created_at', { ascending: false }),
          supabase!.from('agencies').select('id, name, email')
        ]);

        if (subscriptionsResult.error) throw subscriptionsResult.error;
        if (agenciesResult.error) throw agenciesResult.error;

        const subscriptions = subscriptionsResult.data || [];
        const agencies = agenciesResult.data || [];

        return subscriptions.map((sub: any) => {
          const agency = agencies.find((a: any) => a.id === sub.agency_id);
          return {
            ...sub,
            agency_name: agency?.name || 'Agence inconnue',
            agency_email: agency?.email,
          };
        });
      },
      'getAllSubscriptions',
      () => {
        return [
          {
            id: 'demo_sub_1',
            agency_id: 'demo_agency_1',
            agency_name: 'Immobilier Excellence (Démo)',
            plan_type: 'premium',
            status: 'active',
            monthly_fee: 50000,
            created_at: new Date().toISOString()
          }
        ];
      }
    );
  },

  async getPlatformStats() {
    return await safeDbOperation(
      async () => {
        const [agenciesResult, subscriptionsResult, propertiesResult, contractsResult] = await Promise.all([
          supabase!.from('agencies').select('id', { count: 'exact' }),
          supabase!.from('agency_subscriptions').select('agency_id, status, monthly_fee'),
          supabase!.from('properties').select('id', { count: 'exact' }),
          supabase!.from('contracts').select('id, commission_amount')
        ]);

        if (agenciesResult.error) throw agenciesResult.error;
        if (subscriptionsResult.error) throw subscriptionsResult.error;
        if (propertiesResult.error) throw propertiesResult.error;
        if (contractsResult.error) throw contractsResult.error;

        const activeAgencies = subscriptionsResult.data?.filter((s: any) => s.status === 'active').length || 0;
        const totalRevenue = contractsResult.data?.reduce((sum: number, c: any) => sum + (c.commission_amount || 0), 0) || 0;
        const subscriptionRevenue = subscriptionsResult.data?.reduce((sum: number, s: any) => sum + (s.status === 'active' ? s.monthly_fee || 0 : 0), 0) || 0;

        return {
          totalAgencies: agenciesResult.count || 0,
          activeAgencies,
          totalProperties: propertiesResult.count || 0,
          totalContracts: contractsResult.count || 0,
          totalRevenue,
          monthlyGrowth: 12,
          subscriptionRevenue
        };
      },
      'getPlatformStats',
      () => {
        return {
          totalAgencies: 1,
          activeAgencies: 1,
          totalProperties: 5,
          totalContracts: 3,
          totalRevenue: 1500000,
          monthlyGrowth: 12,
          subscriptionRevenue: 50000
        };
      }
    );
  },

  async getRecentAgencies() {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('agencies')
          .select('id, name, city, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return data || [];
      },
      'getRecentAgencies',
      () => {
        return [
          {
            id: 'demo_agency_1',
            name: 'Immobilier Excellence (Démo)',
            city: 'Abidjan',
            created_at: new Date().toISOString()
          }
        ];
      }
    );
  },

  async getSystemAlerts() {
    return await safeDbOperation(
      async () => {
        const alerts = [];
        const { data: overdueAgencies } = await supabase!
          .from('agency_subscriptions')
          .select('agency_id')
          .eq('status', 'overdue');

        if (overdueAgencies && overdueAgencies.length > 0) {
          alerts.push({
            type: 'warning',
            title: `${overdueAgencies.length} agence(s) en retard de paiement`,
            description: 'Suspension automatique programmée'
          });
        }

        if (alerts.length === 0) {
          alerts.push({
            type: 'success',
            title: 'Système opérationnel',
            description: 'Tous les services fonctionnent normalement'
          });
        }

        return alerts;
      },
      'getSystemAlerts',
      () => {
        return [
          {
            type: 'warning',
            title: 'Mode démo activé',
            description: 'Configuration Supabase à vérifier'
          }
        ];
      }
    );
  },

  // Agency and User Management
  async createAgencyWithDirector(agencyData: any, directorData: any) {
    return await safeDbOperation(
      async () => {
        console.log('🔄 Création agence et directeur en production...');
        
        // 1. Créer l'agence
        console.log('📝 Création de l\'agence...');
        const { data: agency, error: agencyError } = await supabase!
          .from('agencies')
          .insert({
            name: agencyData.agency_name,
            commercial_register: agencyData.commercial_register,
            address: agencyData.address,
            city: agencyData.city,
            phone: agencyData.phone,
            email: agencyData.director_email,
            logo: agencyData.logo_url,
            is_accredited: agencyData.is_accredited,
            accreditation_number: agencyData.accreditation_number,
          })
          .select()
          .single();

        if (agencyError) {
          console.error('❌ Erreur création agence:', agencyError);
          throw agencyError;
        }
        
        console.log('✅ Agence créée:', agency.name);

        // 2. Créer le compte directeur dans Supabase Auth avec le mot de passe choisi
        console.log('👤 Création compte directeur...');
        const { data: authUser, error: authError } = await supabase!.auth.admin.createUser({
          email: agencyData.director_email,
          password: directorData.password, // Utiliser le mot de passe choisi par l'utilisateur
          email_confirm: true,
          user_metadata: {
            first_name: agencyData.director_first_name,
            last_name: agencyData.director_last_name,
            role: 'director'
          }
        });

        if (authError) {
          console.error('❌ Erreur création auth:', authError);
          throw authError;
        }
        
        console.log('✅ Compte auth créé pour:', agencyData.director_email);

        // 3. Créer le profil utilisateur
        console.log('📋 Création profil utilisateur...');
        const { data: user, error: userError } = await supabase!
          .from('users')
          .insert({
            id: authUser.user.id,
            email: agencyData.director_email,
            first_name: agencyData.director_first_name,
            last_name: agencyData.director_last_name,
            role: 'director',
            agency_id: agency.id,
            is_active: true,
            permissions: {
              dashboard: true,
              properties: true,
              owners: true,
              tenants: true,
              contracts: true,
              collaboration: true,
              reports: true,
              notifications: true,
              settings: true,
              userManagement: true
            }
          })
          .select()
          .single();

        if (userError) {
          console.error('❌ Erreur création profil:', userError);
          throw userError;
        }
        
        console.log('✅ Profil utilisateur créé');

        // 4. Créer l'abonnement d'essai
        console.log('💰 Création abonnement...');
        const { data: subscription, error: subscriptionError } = await supabase!
          .from('agency_subscriptions')
          .insert({
            agency_id: agency.id,
            plan_type: 'basic',
            status: 'trial',
            monthly_fee: 25000,
            trial_days_remaining: 30
          })
          .select()
          .single();

        if (subscriptionError) {
          console.error('❌ Erreur création abonnement:', subscriptionError);
          throw subscriptionError;
        }
        
        console.log('✅ Abonnement créé');

        return {
          agency,
          user,
          subscription,
          credentials: {
            email: agencyData.director_email,
            password: directorData.password // Retourner le mot de passe choisi
          }
        };
      },
      'createAgencyWithDirector',
      () => {
        // Mode démo - Créer agence localement
        const agencyId = generateId();
        const userId = generateId();
        
        const agency = {
          id: agencyId,
          name: agencyData.agency_name,
          commercial_register: agencyData.commercial_register,
          address: agencyData.address,
          city: agencyData.city,
          phone: agencyData.phone,
          email: agencyData.director_email,
          created_at: new Date().toISOString()
        };
        
        const user = {
          id: userId,
          email: agencyData.director_email,
          first_name: agencyData.director_first_name,
          last_name: agencyData.director_last_name,
          role: 'director',
          agency_id: agencyId,
          is_active: true,
          created_at: new Date().toISOString()
        };
        
        // Stocker en localStorage
        const agencies = JSON.parse(localStorage.getItem(demoStorage.agencies) || '[]');
        agencies.unshift(agency);
        localStorage.setItem(demoStorage.agencies, JSON.stringify(agencies));
        
        const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
        users.unshift(user);
        localStorage.setItem('demo_users', JSON.stringify(users));
        
        return {
          agency,
          user,
          subscription: { id: generateId(), agency_id: agencyId, status: 'trial' },
          credentials: {
            email: agencyData.director_email,
            password: directorData.password // Utiliser le mot de passe choisi
          }
        };
      }
    );
  },

  async createUser(userData: any) {
    return await safeDbOperation(
      async () => {
        console.log('🔄 Création utilisateur en production...');
        
        // 1. Créer le compte dans Supabase Auth
        console.log('👤 Création compte auth pour:', userData.email);
        const { data: authUser, error: authError } = await supabase!.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role
          }
        });

        if (authError) {
          console.error('❌ Erreur création auth:', authError);
          throw authError;
        }
        
        console.log('✅ Compte auth créé avec ID:', authUser.user.id);

        // 2. Créer le profil utilisateur
        console.log('📋 Création profil utilisateur...');
        const { data: user, error: userError } = await supabase!
          .from('users')
          .insert({
            id: authUser.user.id,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role,
            agency_id: userData.agency_id,
            is_active: true,
            permissions: userData.permissions || {}
          })
          .select()
          .single();

        if (userError) {
          console.error('❌ Erreur création profil:', userError);
          throw userError;
        }
        
        console.log('✅ Profil utilisateur créé');
        return user;
      },
      'createUser',
      () => {
        // Mode démo - Créer utilisateur localement
        const newUser = {
          id: generateId(),
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          agency_id: userData.agency_id,
          is_active: true,
          permissions: userData.permissions || {},
          created_at: new Date().toISOString()
        };
        
        const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
        users.unshift(newUser);
        localStorage.setItem('demo_users', JSON.stringify(users));
        
        return newUser;
      }
    );
  },

  async updateUser(id: string, updates: any) {
    return await safeDbOperation(
      async () => {
        console.log('🔄 Mise à jour utilisateur:', id);
        
        const { data, error } = await supabase!
          .from('users')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
          
        if (error) {
          console.error('❌ Erreur mise à jour utilisateur:', error);
          throw error;
        }
        
        console.log('✅ Utilisateur mis à jour');
        return data;
      },
      'updateUser',
      () => {
        const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
        const index = users.findIndex((u: any) => u.id === id);
        if (index !== -1) {
          users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
          localStorage.setItem('demo_users', JSON.stringify(users));
          return users[index];
        }
        throw new Error('Utilisateur non trouvé');
      }
    );
  },

  // Search functions
  async searchOwnersHistory(searchTerm: string) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('owners')
          .select(`
            *,
            agencies(name)
          `)
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      'searchOwnersHistory',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.owners) || '[]');
        return stored.filter((owner: any) =>
          owner.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          owner.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          owner.phone.includes(searchTerm)
        ).slice(0, 10);
      }
    );
  },

  async searchTenantsHistory(searchTerm: string, paymentStatus?: string) {
    return await safeDbOperation(
      async () => {
        let query = supabase!
          .from('tenants')
          .select(`
            *,
            agencies(name)
          `)
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);

        if (paymentStatus && paymentStatus !== 'all') {
          query = query.eq('payment_status', paymentStatus);
        }

        const { data, error } = await query.limit(50);
        if (error) throw error;
        return data || [];
      },
      'searchTenantsHistory',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.tenants) || '[]');
        let filtered = stored.filter((tenant: any) =>
          tenant.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.phone.includes(searchTerm)
        );

        if (paymentStatus && paymentStatus !== 'all') {
          filtered = filtered.filter((t: any) => t.payment_status === paymentStatus);
        }

        return filtered.slice(0, 10);
      }
    );
  },

  // Financial statements
  async getFinancialStatements(entityId: string, entityType: 'owner' | 'tenant', period: string) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('financial_statements')
          .select('*')
          .eq('entity_id', entityId)
          .eq('entity_type', entityType)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single();
        if (error) throw error;
        return data;
      },
      'getFinancialStatements',
      () => {
        // Générer des données financières basées sur les contrats réels
        const contracts = JSON.parse(localStorage.getItem(demoStorage.contracts) || '[]');
        const entityContracts = contracts.filter((c: any) => 
          (entityType === 'owner' && c.owner_id === entityId) ||
          (entityType === 'tenant' && c.tenant_id === entityId)
        );
        
        const totalIncome = entityContracts.reduce((sum: number, c: any) => 
          sum + (entityType === 'owner' ? (c.monthly_rent || 0) - (c.commission_amount || 0) : 0), 0
        );
        
        const totalExpenses = entityContracts.reduce((sum: number, c: any) => 
          sum + (entityType === 'tenant' ? (c.monthly_rent || 0) : (c.commission_amount || 0)), 0
        );
        
        return {
          id: `statement_${entityId}_${period}`,
          entity_id: entityId,
          entity_type: entityType,
          period_start: new Date(`${period}-01`),
          period_end: new Date(`${period}-31`),
          total_income: totalIncome,
          total_expenses: totalExpenses,
          net_balance: totalIncome - totalExpenses,
          pending_payments: 0,
          transactions: [],
          generated_at: new Date().toISOString()
        };
      }
    );
  },

  // Real-time subscriptions avec fallback
  async subscribeToChanges(table: string, callback: (payload: any) => void) {
    if (!supabase || !isSupabaseConfigured) {
      console.warn(`⚠️ Souscription temps réel non disponible pour ${table} - Mode démo`);
      return null;
    }
    
    try {
      console.log(`🔄 Souscription temps réel pour table: ${table}`);
      return supabase
        .channel(`${table}_changes`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table }, 
          (payload) => {
            console.log(`📡 Changement détecté sur ${table}:`, payload);
            callback(payload);
          }
        )
        .subscribe();
    } catch (error) {
      console.error('❌ Erreur souscription temps réel:', error);
      return null;
    }
  },

  async unsubscribeFromChanges(subscription: any) {
    if (!subscription) return;
    
    try {
      if (typeof subscription.unsubscribe === 'function') {
        await subscription.unsubscribe();
        console.log('✅ Désouscription temps réel réussie');
      }
    } catch (error) {
      console.warn('⚠️ Erreur désouscription:', error);
    }
  }
};