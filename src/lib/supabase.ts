import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification configuration Supabase
const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.includes('supabase.co') &&
  supabaseAnonKey.startsWith('eyJ') &&
  supabaseAnonKey.length > 100
);

console.log('🔧 Configuration Supabase:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  isConfigured: isSupabaseConfigured,
  environment: import.meta.env.MODE
});

// Créer le client Supabase seulement si configuré
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}) : null;

if (isSupabaseConfigured) {
  console.log('✅ Client Supabase créé avec succès');
} else {
  console.warn('⚠️ Supabase non configuré - Mode démo activé');
}

// Générateur d'ID unique pour le mode démo
const generateId = () => `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Stockage local pour le mode démo
const demoStorage = {
  owners: 'demo_owners',
  tenants: 'demo_tenants',
  properties: 'demo_properties',
  contracts: 'demo_contracts',
  agencies: 'demo_agencies',
  users: 'demo_users',
};

// Helper function pour opérations base de données avec fallback démo
const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  demoFallback?: () => T
): Promise<T> => {
  console.log(`🔄 ${operationName} - Début opération...`);
  
  // Si Supabase non configuré, utiliser directement le mode démo
  if (!supabase || !isSupabaseConfigured) {
    console.warn(`⚠️ ${operationName} - Supabase non configuré, utilisation mode démo`);
    
    if (demoFallback) {
      console.log(`📦 ${operationName} - Exécution fallback démo`);
      const result = demoFallback();
      console.log(`✅ ${operationName} - Succès mode démo`);
      return result;
    }
    
    throw new Error(`${operationName} non disponible - Configuration Supabase requise`);
  }
  
  try {
    console.log(`📡 ${operationName} - Exécution opération Supabase...`);
    const result = await operation();
    console.log(`✅ ${operationName} - Succès Supabase`);
    return result;
  } catch (error: any) {
    console.error(`❌ ${operationName} - ERREUR SUPABASE:`, error);
    
    // Si erreur Supabase et fallback disponible, utiliser le mode démo
    if (demoFallback) {
      console.warn(`⚠️ ${operationName} - Erreur Supabase, basculement mode démo`);
      const result = demoFallback();
      console.log(`✅ ${operationName} - Succès mode démo`);
      return result;
    }
    
    throw error;
  }
};

// Database service functions avec fallback démo complet
export const dbService = {
  // Owners
  async createOwner(owner: any) {
    console.log('🔄 dbService.createOwner appelé avec:', owner);
    
    return await safeDbOperation(
      async () => {
        if (!owner.agency_id) {
          throw new Error('agency_id manquant dans les données');
        }
        
        if (!owner.first_name || !owner.last_name || !owner.phone) {
          throw new Error('Champs obligatoires manquants: first_name, last_name, phone');
        }
        
        const { data, error } = await supabase!
          .from('owners')
          .insert(owner)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Erreur Supabase insertion:', error);
          throw error;
        }
        
        console.log('✅ Propriétaire créé en Supabase:', data);
        return data;
      },
      'createOwner',
      () => {
        // Mode démo - Créer propriétaire localement
        console.log('📦 Création propriétaire en mode démo');
        const newOwner = {
          ...owner,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const stored = JSON.parse(localStorage.getItem(demoStorage.owners) || '[]');
        stored.unshift(newOwner);
        localStorage.setItem(demoStorage.owners, JSON.stringify(stored));
        
        console.log('✅ Propriétaire créé en mode démo:', newOwner.id);
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
          .update({ ...updates, updated_at: new Date().toISOString() })
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
        if (!tenant.agency_id) {
          throw new Error('agency_id manquant');
        }
        
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
        const newTenant = {
          ...tenant,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
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
          .update({ ...updates, updated_at: new Date().toISOString() })
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
        if (!property.agency_id) {
          throw new Error('agency_id manquant');
        }
        
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
        const newProperty = {
          ...property,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
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
        let query = supabase!.from('properties').select('*');
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
          .update({ ...updates, updated_at: new Date().toISOString() })
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
        if (!contract.agency_id) {
          throw new Error('agency_id manquant');
        }
        
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
        const newContract = {
          ...contract,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
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
        let query = supabase!.from('contracts').select('*');
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
          .update({ ...updates, updated_at: new Date().toISOString() })
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

  // Users
  async createUser(userData: any) {
    return await safeDbOperation(
      async () => {
        // Créer d'abord dans Supabase Auth
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

        if (authError) throw authError;

        // Puis créer le profil
        const { data: user, error: userError } = await supabase!
          .from('users')
          .insert({
            id: authUser.user.id,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role,
            agency_id: userData.agency_id,
            is_active: userData.is_active,
            permissions: userData.permissions || {}
          })
          .select()
          .single();

        if (userError) throw userError;
        return user;
      },
      'createUser',
      () => {
        const newUser = {
          ...userData,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const stored = JSON.parse(localStorage.getItem(demoStorage.users) || '[]');
        stored.unshift(newUser);
        localStorage.setItem(demoStorage.users, JSON.stringify(stored));
        
        return newUser;
      }
    );
  },

  async getUsers(agencyId?: string) {
    return await safeDbOperation(
      async () => {
        let query = supabase!.from('users').select('*');
        if (agencyId) {
          query = query.eq('agency_id', agencyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      'getUsers',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.users) || '[]');
        return agencyId ? stored.filter((u: any) => u.agency_id === agencyId) : stored;
      }
    );
  },

  async updateUser(id: string, updates: any) {
    return await safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('users')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateUser',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.users) || '[]');
        const index = stored.findIndex((u: any) => u.id === id);
        if (index !== -1) {
          stored[index] = { ...stored[index], ...updates, updated_at: new Date().toISOString() };
          localStorage.setItem(demoStorage.users, JSON.stringify(stored));
          return stored[index];
        }
        
        // Vérifier aussi dans approved_accounts
        const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
        const accountIndex = approvedAccounts.findIndex((acc: any) => acc.id === id);
        if (accountIndex !== -1) {
          approvedAccounts[accountIndex] = { ...approvedAccounts[accountIndex], ...updates };
          localStorage.setItem('approved_accounts', JSON.stringify(approvedAccounts));
          return approvedAccounts[accountIndex];
        }
        
        throw new Error('Utilisateur non trouvé');
      }
    );
  },

  async deleteUser(id: string) {
    return await safeDbOperation(
      async () => {
        // Supprimer de Supabase Auth et de la table users
        const { error: authError } = await supabase!.auth.admin.deleteUser(id);
        if (authError) console.warn('Erreur suppression auth:', authError);
        
        const { error } = await supabase!.from('users').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      'deleteUser',
      () => {
        const stored = JSON.parse(localStorage.getItem(demoStorage.users) || '[]');
        const filtered = stored.filter((u: any) => u.id !== id);
        localStorage.setItem(demoStorage.users, JSON.stringify(filtered));
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
        // Chercher dans approved_accounts
        const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
        const account = approvedAccounts.find((acc: any) => acc.agencyId === id);
        
        if (account?.agencyData) {
          return account.agencyData;
        }
        
        // Données d'agence démo par défaut
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

  // Dashboard stats
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
        return data;
      },
      'createRegistrationRequest',
      () => {
        const newRequest = {
          ...request,
          id: generateId(),
          created_at: new Date().toISOString()
        };
        
        const stored = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        stored.unshift(newRequest);
        localStorage.setItem('demo_registration_requests', JSON.stringify(stored));
        
        return newRequest;
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
        const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
        return approvedAccounts.map((acc: any) => ({
          ...acc.agencyData,
          subscription_status: 'active',
          plan_type: 'basic',
          monthly_fee: 25000
        }));
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
        const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
        return approvedAccounts.map((acc: any) => ({
          id: `sub_${acc.id}`,
          agency_id: acc.agencyId,
          agency_name: acc.agencyData?.name || 'Agence démo',
          plan_type: 'basic',
          status: 'active',
          monthly_fee: 25000,
          created_at: acc.createdAt
        }));
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
        const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
        const allOwners = JSON.parse(localStorage.getItem(demoStorage.owners) || '[]');
        const allProperties = JSON.parse(localStorage.getItem(demoStorage.properties) || '[]');
        const allContracts = JSON.parse(localStorage.getItem(demoStorage.contracts) || '[]');
        
        return {
          totalAgencies: approvedAccounts.length,
          activeAgencies: approvedAccounts.length,
          totalProperties: allProperties.length,
          totalContracts: allContracts.length,
          totalRevenue: allContracts.length * 350000 * 0.1,
          monthlyGrowth: 12,
          subscriptionRevenue: approvedAccounts.length * 25000
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
        const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
        return approvedAccounts.slice(0, 5).map((acc: any) => ({
          id: acc.agencyId,
          name: acc.agencyData?.name || 'Agence démo',
          city: acc.agencyData?.city || 'Abidjan',
          created_at: acc.createdAt
        }));
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
            type: 'info',
            title: 'Mode démo activé',
            description: 'Configuration Supabase à vérifier pour la production'
          }
        ];
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
        ).slice(0, 10).map((owner: any) => ({
          ...owner,
          agencies: { name: 'Agence démo' }
        }));
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

        return filtered.slice(0, 10).map((tenant: any) => ({
          ...tenant,
          agencies: { name: 'Agence démo' }
        }));
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

  // Real-time subscriptions
  subscribeToChanges(table: string, callback: (payload: any) => void) {
    if (!supabase || !isSupabaseConfigured) {
      console.warn(`⚠️ Souscription temps réel non disponible pour ${table} - Mode démo`);
      return null;
    }
    
    try {
      console.log(`📡 Souscription temps réel pour table: ${table}`);
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

  unsubscribeFromChanges(subscription: any) {
    if (!subscription) return;
    
    try {
      if (typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
        console.log('✅ Désouscription temps réel réussie');
      }
    } catch (error) {
      console.warn('⚠️ Erreur désouscription:', error);
    }
  }
};