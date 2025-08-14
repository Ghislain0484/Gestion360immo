import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification stricte des variables d'environnement
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

// Créer le client Supabase OBLIGATOIREMENT
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
    throw new Error('Configuration Supabase manquante - Vérifiez les variables d\'environnement sur Vercel');
  }
  
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'apikey': supabaseAnonKey,
        },
      },
    });
    
    console.log('✅ Client Supabase créé avec succès');
    return client;
  } catch (error) {
    console.error('❌ Erreur création client Supabase:', error);
    throw new Error('Impossible de créer le client Supabase');
  }
})();

// Helper function pour opérations base de données FORCÉES
const forceDbOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  console.log(`🔄 ${operationName} - Tentative...`);
  
  try {
    const result = await operation();
    console.log(`✅ ${operationName} - Succès en base de données`);
    return result;
  } catch (error: any) {
    console.error(`❌ ${operationName} - Erreur:`, error);
    
    // Gestion spécifique des erreurs API
    if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
      throw new Error(`🔑 Configuration Supabase invalide - Vérifiez les variables d'environnement sur Vercel`);
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
      throw new Error(`🌐 Erreur réseau - Vérifiez la connexion`);
    } else if (error.message?.includes('permission denied')) {
      throw new Error(`🚫 Permissions insuffisantes - Vérifiez les politiques RLS`);
    } else {
      throw error;
    }
  }
};

// Database service functions - FORCE SUPABASE USAGE
export const dbService = {
  // Agencies
  async createAgency(agency: any) {
    return await forceDbOperation(
      async () => {
        const { data, error } = await supabase
          .from('agencies')
          .insert(agency)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'createAgency'
    );
  },

  async getAgency(id: string) {
    return await forceDbOperation(
      async () => {
        if (!id) throw new Error('ID agence manquant');
        
        const { data, error } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data;
      },
      'getAgency'
    );
  },

  // Registration requests - FORCE CREATION
  async createRegistrationRequest(request: any) {
    return await forceDbOperation(
      async () => {
        // Validation stricte
        const requiredFields = ['agency_name', 'commercial_register', 'director_first_name', 'director_last_name', 'director_email', 'phone', 'city', 'address'];
        for (const field of requiredFields) {
          if (!request[field] || (typeof request[field] === 'string' && !request[field].trim())) {
            throw new Error(`Le champ ${field} est obligatoire`);
          }
        }
        
        // Validation email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.director_email)) {
          throw new Error('Format d\'email invalide');
        }
        
        // Validation téléphone
        if (!/^(\+225)?[0-9\s-]{8,15}$/.test(request.phone)) {
          throw new Error('Format de téléphone invalide');
        }
        
        console.log('📝 Création demande inscription en base:', request);
        
        const { data, error } = await supabase
          .from('agency_registration_requests')
          .insert(request)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Erreur Supabase détaillée:', error);
          throw new Error(`Erreur base de données: ${error.message}`);
        }
        
        console.log('✅ Demande créée en base avec succès:', data);
        return data;
      },
      'createRegistrationRequest'
    );
  },

  // Owners - FORCE CREATION
  async createOwner(owner: any) {
    return await forceDbOperation(
      async () => {
        // Validation stricte
        const requiredFields = ['first_name', 'last_name', 'phone', 'agency_id', 'address', 'city'];
        for (const field of requiredFields) {
          if (!owner[field] || (typeof owner[field] === 'string' && !owner[field].trim())) {
            throw new Error(`Le champ ${field} est obligatoire`);
          }
        }
        
        // Validation types
        if (typeof owner.children_count !== 'number' || owner.children_count < 0) {
          throw new Error('Le nombre d\'enfants doit être un nombre positif');
        }
        
        // Validation énumérations
        const validPropertyTitles = ['attestation_villageoise', 'lettre_attribution', 'permis_habiter', 'acd', 'tf', 'cpf', 'autres'];
        if (!validPropertyTitles.includes(owner.property_title)) {
          throw new Error('Type de titre de propriété invalide');
        }
        
        const validMaritalStatuses = ['celibataire', 'marie', 'divorce', 'veuf'];
        if (!validMaritalStatuses.includes(owner.marital_status)) {
          throw new Error('Situation matrimoniale invalide');
        }
        
        console.log('📝 Création propriétaire en base:', owner);
        
        const { data, error } = await supabase
          .from('owners')
          .insert(owner)
          .select()
          .single();
          
        if (error) {
          console.error('❌ Erreur création propriétaire:', error);
          throw new Error(`Erreur base de données: ${error.message}`);
        }
        
        console.log('✅ Propriétaire créé en base avec succès:', data);
        return data;
      },
      'createOwner'
    );
  },

  async getOwners(agencyId: string) {
    return await forceDbOperation(
      async () => {
        if (!agencyId) throw new Error('ID d\'agence manquant');
        
        const { data, error } = await supabase
          .from('owners')
          .select('*')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        return data || [];
      },
      'getOwners'
    );
  },

  async updateOwner(id: string, updates: any) {
    return await forceDbOperation(
      async () => {
        const { data, error } = await supabase
          .from('owners')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateOwner'
    );
  },

  async deleteOwner(id: string) {
    return await forceDbOperation(
      async () => {
        const { error } = await supabase
          .from('owners')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      'deleteOwner'
    );
  },

  // Tenants - FORCE CREATION
  async createTenant(tenant: any) {
    return await forceDbOperation(
      async () => {
        // Validation stricte
        const requiredFields = ['first_name', 'last_name', 'phone', 'agency_id', 'profession', 'nationality'];
        for (const field of requiredFields) {
          if (!tenant[field] || (typeof tenant[field] === 'string' && !tenant[field].trim())) {
            throw new Error(`Le champ ${field} est obligatoire`);
          }
        }
        
        // Validation énumérations
        const validMaritalStatuses = ['celibataire', 'marie', 'divorce', 'veuf'];
        if (!validMaritalStatuses.includes(tenant.marital_status)) {
          throw new Error('Situation matrimoniale invalide');
        }
        
        const validPaymentStatuses = ['bon', 'irregulier', 'mauvais'];
        if (!validPaymentStatuses.includes(tenant.payment_status)) {
          throw new Error('Statut de paiement invalide');
        }
        
        console.log('📝 Création locataire en base:', tenant);
        
        const { data, error } = await supabase
          .from('tenants')
          .insert(tenant)
          .select()
          .single();
          
        if (error) {
          console.error('❌ Erreur création locataire:', error);
          throw new Error(`Erreur base de données: ${error.message}`);
        }
        
        console.log('✅ Locataire créé en base avec succès:', data);
        return data;
      },
      'createTenant'
    );
  },

  async getTenants(agencyId: string) {
    return await forceDbOperation(
      async () => {
        if (!agencyId) throw new Error('Agency ID manquant');
        
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      'getTenants'
    );
  },

  async updateTenant(id: string, updates: any) {
    return await forceDbOperation(
      async () => {
        const { data, error } = await supabase
          .from('tenants')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateTenant'
    );
  },

  async deleteTenant(id: string) {
    return await forceDbOperation(
      async () => {
        const { error } = await supabase
          .from('tenants')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      'deleteTenant'
    );
  },

  // Properties - FORCE CREATION
  async createProperty(property: any) {
    return await forceDbOperation(
      async () => {
        // Validation des données obligatoires
        if (!property.title || !property.owner_id || !property.agency_id) {
          throw new Error('Données propriété manquantes (titre, propriétaire, agence)');
        }
        
        console.log('📝 Création propriété en base:', property);
        
        const { data, error } = await supabase
          .from('properties')
          .insert(property)
          .select()
          .single();
        if (error) {
          console.error('❌ Erreur création propriété:', error);
          throw new Error(`Erreur base de données: ${error.message}`);
        }
        
        console.log('✅ Propriété créée en base avec succès:', data);
        return data;
      },
      'createProperty'
    );
  },

  async getProperties(agencyId: string) {
    return await forceDbOperation(
      async () => {
        if (!agencyId) throw new Error('Agency ID manquant');
        
        const { data, error } = await supabase
          .from('properties')
          .select(`
            *,
            owners(first_name, last_name)
          `)
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      'getProperties'
    );
  },

  async updateProperty(id: string, updates: any) {
    return await forceDbOperation(
      async () => {
        const { data, error } = await supabase
          .from('properties')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateProperty'
    );
  },

  async deleteProperty(id: string) {
    return await forceDbOperation(
      async () => {
        const { error } = await supabase
          .from('properties')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      'deleteProperty'
    );
  },

  // Contracts - FORCE CREATION
  async createContract(contract: any) {
    return await forceDbOperation(
      async () => {
        // Validation complète
        const requiredFields = ['agency_id', 'type', 'start_date', 'commission_rate', 'terms'];
        for (const field of requiredFields) {
          if (contract[field] === undefined || contract[field] === null) {
            throw new Error(`Le champ ${field} est obligatoire pour le contrat`);
          }
        }
        
        // Validation spécifique par type
        if (contract.type === 'gestion' && !contract.owner_id) {
          throw new Error('ID propriétaire obligatoire pour contrat de gestion');
        }
        
        if (contract.type === 'location') {
          if (!contract.tenant_id) {
            throw new Error('ID locataire obligatoire pour contrat de location');
          }
          if (!contract.monthly_rent || contract.monthly_rent <= 0) {
            throw new Error('Loyer mensuel obligatoire pour contrat de location');
          }
        }
        
        // Validation des montants
        if (contract.commission_rate < 0 || contract.commission_rate > 100) {
          throw new Error('Taux de commission invalide (0-100%)');
        }
        
        console.log('📝 Création contrat en base:', contract);
        
        const { data, error } = await supabase
          .from('contracts')
          .insert(contract)
          .select()
          .single();
          
        if (error) {
          console.error('❌ Erreur création contrat:', error);
          throw new Error(`Erreur base de données: ${error.message}`);
        }
        
        console.log('✅ Contrat créé en base avec succès:', data);
        return data;
      },
      'createContract'
    );
  },

  async getContracts(agencyId: string) {
    return await forceDbOperation(
      async () => {
        if (!agencyId) throw new Error('Agency ID manquant');
        
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            *,
            properties(title),
            owners(first_name, last_name),
            tenants(first_name, last_name)
          `)
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      'getContracts'
    );
  },

  async updateContract(id: string, updates: any) {
    return await forceDbOperation(
      async () => {
        const { data, error } = await supabase
          .from('contracts')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      'updateContract'
    );
  },

  async deleteContract(id: string) {
    return await forceDbOperation(
      async () => {
        const { error } = await supabase
          .from('contracts')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      'deleteContract'
    );
  },

  // Dashboard stats avec données réelles FORCÉES
  async getDashboardStats(agencyId: string) {
    return await forceDbOperation(
      async () => {
        if (!agencyId) throw new Error('Agency ID manquant');
        
        // Récupération forcée des statistiques réelles
        const [propertiesResult, ownersResult, tenantsResult, contractsResult] = await Promise.all([
          supabase.from('properties').select('id', { count: 'exact' }).eq('agency_id', agencyId),
          supabase.from('owners').select('id', { count: 'exact' }).eq('agency_id', agencyId),
          supabase.from('tenants').select('id', { count: 'exact' }).eq('agency_id', agencyId),
          supabase.from('contracts').select('id, monthly_rent, status', { count: 'exact' }).eq('agency_id', agencyId)
        ]);

        // Vérification des erreurs
        if (propertiesResult.error) throw propertiesResult.error;
        if (ownersResult.error) throw ownersResult.error;
        if (tenantsResult.error) throw tenantsResult.error;
        if (contractsResult.error) throw contractsResult.error;

        const activeContracts = contractsResult.data?.filter(c => c.status === 'active') || [];
        const monthlyRevenue = activeContracts.reduce((sum, c) => sum + (c.monthly_rent || 0), 0);
        const totalProperties = propertiesResult.count || 0;
        const occupancyRate = totalProperties > 0 ? (activeContracts.length / totalProperties) * 100 : 0;

        const stats = {
          totalProperties: propertiesResult.count || 0,
          totalOwners: ownersResult.count || 0,
          totalTenants: tenantsResult.count || 0,
          totalContracts: contractsResult.count || 0,
          monthlyRevenue,
          activeContracts: activeContracts.length,
          occupancyRate: Math.round(occupancyRate * 10) / 10
        };

        console.log('✅ Statistiques récupérées:', stats);
        return stats;
      },
      'getDashboardStats'
    );
  },

  // Real-time subscriptions
  async subscribeToChanges(table: string, callback: (payload: any) => void) {
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
  },

  // Admin functions
  async getAllAgencies() {
    return await forceDbOperation(
      async () => {
        const [agenciesResult, subscriptionsResult] = await Promise.all([
          supabase.from('agencies').select('*').order('created_at', { ascending: false }),
          supabase.from('agency_subscriptions').select('agency_id, plan_type, status, monthly_fee, next_payment_date')
        ]);

        if (agenciesResult.error) throw agenciesResult.error;
        if (subscriptionsResult.error) throw subscriptionsResult.error;

        const agencies = agenciesResult.data || [];
        const subscriptions = subscriptionsResult.data || [];

        // Enrichir avec les données d'abonnement
        const enrichedAgencies = agencies.map((agency: any) => {
          const subscription = subscriptions.find((sub: any) => sub.agency_id === agency.id);
          return {
            ...agency,
            subscription_status: subscription?.status || 'trial',
            plan_type: subscription?.plan_type || 'basic',
            monthly_fee: subscription?.monthly_fee || 25000,
            next_payment_date: subscription?.next_payment_date,
          };
        });

        return enrichedAgencies;
      },
      'getAllAgencies'
    );
  },

  async getRegistrationRequests() {
    return await forceDbOperation(
      async () => {
        const { data, error } = await supabase
          .from('agency_registration_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      },
      'getRegistrationRequests'
    );
  },

  async updateRegistrationRequest(id: string, updates: any) {
    return await forceDbOperation(
      async () => {
        console.log('📝 Mise à jour demande:', id, updates);
        
        const { data, error } = await supabase
          .from('agency_registration_requests')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      'updateRegistrationRequest'
    );
  },

  async getAllSubscriptions() {
    return await forceDbOperation(
      async () => {
        const [subscriptionsResult, agenciesResult] = await Promise.all([
          supabase.from('agency_subscriptions').select('*').order('created_at', { ascending: false }),
          supabase.from('agencies').select('id, name, email')
        ]);

        if (subscriptionsResult.error) throw subscriptionsResult.error;
        if (agenciesResult.error) throw agenciesResult.error;

        const subscriptions = subscriptionsResult.data || [];
        const agencies = agenciesResult.data || [];

        const enrichedSubscriptions = subscriptions.map((sub: any) => {
          const agency = agencies.find((a: any) => a.id === sub.agency_id);
          return {
            ...sub,
            agency_name: agency?.name || 'Agence inconnue',
            agency_email: agency?.email,
          };
        });

        return enrichedSubscriptions;
      },
      'getAllSubscriptions'
    );
  },

  async getPlatformStats() {
    return await forceDbOperation(
      async () => {
        const [agenciesResult, subscriptionsResult, propertiesResult, contractsResult] = await Promise.all([
          supabase.from('agencies').select('id', { count: 'exact' }),
          supabase.from('agency_subscriptions').select('agency_id, status, monthly_fee'),
          supabase.from('properties').select('id', { count: 'exact' }),
          supabase.from('contracts').select('id, commission_amount')
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
          monthlyGrowth: 0,
          subscriptionRevenue
        };
      },
      'getPlatformStats'
    );
  },

  async getRecentAgencies() {
    return await forceDbOperation(
      async () => {
        const { data, error } = await supabase
          .from('agencies')
          .select('id, name, city, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        return data || [];
      },
      'getRecentAgencies'
    );
  },

  async getSystemAlerts() {
    return await forceDbOperation(
      async () => {
        const alerts = [];

        // Vérifier les abonnements en retard
        const { data: overdueAgencies } = await supabase
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

        // Vérifier les agences suspendues
        const { data: suspendedAgencies } = await supabase
          .from('agency_subscriptions')
          .select('agency_id')
          .eq('status', 'suspended');

        if (suspendedAgencies && suspendedAgencies.length > 0) {
          alerts.push({
            type: 'error',
            title: `${suspendedAgencies.length} agence(s) suspendue(s)`,
            description: 'Impayés confirmés'
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
      'getSystemAlerts'
    );
  },

  // Search functions
  async searchOwnersHistory(searchTerm: string) {
    return await forceDbOperation(
      async () => {
        const { data, error } = await supabase
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
      'searchOwnersHistory'
    );
  },

  async searchTenantsHistory(searchTerm: string, paymentStatus?: string) {
    return await forceDbOperation(
      async () => {
        let query = supabase
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
      'searchTenantsHistory'
    );
  }
};