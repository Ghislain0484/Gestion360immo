import { createClient } from '@supabase/supabase-js';
import { generateDemoId } from '../utils/uuidGenerator';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification robuste des variables d'environnement
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
  environment: import.meta.env.MODE
});

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase not configured properly - using offline mode', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlValid: supabaseUrl?.startsWith('https://') && supabaseUrl?.includes('.supabase.co'),
    keyValid: supabaseAnonKey?.startsWith('eyJ') && supabaseAnonKey?.length > 100
  });
}

// Créer le client Supabase avec gestion d'erreur
export const supabase = (() => {
  if (!isSupabaseConfigured) {
    console.warn('🚫 Supabase client not created - configuration invalid');
    return null;
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
    
    console.log('✅ Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('❌ Erreur lors de la création du client Supabase:', error);
    return null;
  }
})();

// Helper function for safe database operations
const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string
): Promise<T> => {
  if (!supabase || !isSupabaseConfigured) {
    console.warn(`🔄 ${operationName} - Mode démo activé`);
    return fallbackValue;
  }

  try {
    const result = await operation();
    console.log(`✅ ${operationName} - Succès`);
    return result;
  } catch (error: any) {
    console.error(`❌ ${operationName} - Erreur:`, error);
    
    // Handle specific API key errors
    if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
      console.error('🔑 Erreur de clé API - Passage en mode démo');
      return fallbackValue;
    }
    
    // Handle network errors
    if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
      console.warn('🌐 Erreur réseau - Passage en mode démo');
      return fallbackValue;
    }
    
    throw error;
  }
};

// Database service functions
export const dbService = {
  // Agencies
  async createAgency(agency: any) {
    return safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('agencies')
          .insert(agency)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      { id: generateDemoId(), ...agency, created_at: new Date().toISOString() },
      'createAgency'
    );
  },

  async getAgency(id: string) {
    return safeDbOperation(
      async () => {
        if (!id) throw new Error('ID agence manquant');
        
        const { data, error } = await supabase!
          .from('agencies')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('❌ Erreur récupération agence:', error);
          throw new Error(`Impossible de charger l'agence: ${error.message}`);
        }
        
        return data;
      },
      {
        id: id,
        name: 'Immobilier Excellence',
        address: 'Abidjan, Côte d\'Ivoire',
        phone: '+225 01 02 03 04 05',
        email: 'contact@agence.com',
        commercial_register: 'CI-ABJ-2024-B-12345',
        city: 'Abidjan',
        is_accredited: false,
        created_at: new Date().toISOString()
      },
      'getAgency'
    );
  },

  // Users
  async createUser(user: any) {
    return safeDbOperation(
      async () => {
        // Validation des données
        if (!user.email || !user.first_name || !user.last_name) {
          throw new Error('Données utilisateur manquantes');
        }
        
        const { data, error } = await supabase!
          .from('users')
          .insert(user)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      { id: generateDemoId(), ...user, created_at: new Date().toISOString() },
      'createUser'
    );
  },

  async getUsers(agencyId: string) {
    return safeDbOperation(
      async () => {
        if (!agencyId) throw new Error('Agency ID manquant');
        
        const { data, error } = await supabase!
          .from('users')
          .select('*')
          .eq('agency_id', agencyId);
        if (error) throw error;
        return data;
      },
      [],
      'getUsers'
    );
  },

  async updateUser(id: string, updates: any) {
    return safeDbOperation(
      async () => {
        if (!id || !updates) throw new Error('Paramètres manquants');
        
        const { data, error } = await supabase!
          .from('users')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      { id, ...updates },
      'updateUser'
    );
  },

  // Real-time data synchronization
  async subscribeToChanges(table: string, callback: (payload: any) => void) {
    if (!supabase) return null;
    
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
  },

  async unsubscribeFromChanges(subscription: any) {
    if (!subscription) return;
    
    try {
      if (typeof subscription.unsubscribe === 'function') {
        await subscription.unsubscribe();
      }
    } catch (error) {
      console.warn('Error unsubscribing from channel:', error);
    }
  },

  // Dashboard stats with real data
  async getDashboardStats(agencyId: string) {
    return safeDbOperation(
      async () => {
        // Get real stats from database
        const [propertiesResult, ownersResult, tenantsResult, contractsResult] = await Promise.all([
          supabase!.from('properties').select('id', { count: 'exact' }).eq('agency_id', agencyId),
          supabase!.from('owners').select('id', { count: 'exact' }).eq('agency_id', agencyId),
          supabase!.from('tenants').select('id', { count: 'exact' }).eq('agency_id', agencyId),
          supabase!.from('contracts').select('id, monthly_rent, status', { count: 'exact' }).eq('agency_id', agencyId)
        ]);

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
      {
        totalProperties: 0,
        totalOwners: 0,
        totalTenants: 0,
        totalContracts: 0,
        monthlyRevenue: 0,
        activeContracts: 0,
        occupancyRate: 0
      },
      'getDashboardStats'
    );
  },

  // Admin platform stats
  async getPlatformStats() {
    return safeDbOperation(
      async () => {
        // Get basic counts with timeout and error handling
        const [agenciesResult, subscriptionsResult] = await Promise.all([
          Promise.race([
            supabase!.from('agencies').select('id', { count: 'exact' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]),
          Promise.race([
            supabase!.from('agency_subscriptions').select('agency_id, status', { count: 'exact' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ])
        ]);
        
        const [propertiesResult, contractsResult] = await Promise.all([
          Promise.race([
            supabase!.from('properties').select('id', { count: 'exact' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]),
          Promise.race([
            supabase!.from('contracts').select('id, commission_amount', { count: 'exact' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ])
        ]);
        
        const subscriptionRevenueResult = await Promise.race([
          supabase!.from('agency_subscriptions').select('monthly_fee, status', { count: 'exact' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        // Process results safely
        const activeAgencies = (subscriptionsResult as any)?.data?.filter((s: any) => s.status === 'active').length || 0;
        const totalRevenue = (contractsResult as any)?.data?.reduce((sum: number, c: any) => sum + (c.commission_amount || 0), 0) || 0;
        const subscriptionRevenue = (subscriptionRevenueResult as any)?.data?.reduce((sum: number, s: any) => sum + (s.status === 'active' ? s.monthly_fee || 0 : 0), 0) || 0;

        return {
          totalAgencies: (agenciesResult as any)?.count || 0,
          activeAgencies,
          totalProperties: (propertiesResult as any)?.count || 0,
          totalContracts: (contractsResult as any)?.count || 0,
          totalRevenue,
          monthlyGrowth: 0,
          subscriptionRevenue
        };
      },
      {
        totalAgencies: 0,
        activeAgencies: 0,
        totalProperties: 0,
        totalContracts: 0,
        totalRevenue: 0,
        monthlyGrowth: 0,
        subscriptionRevenue: 0
      },
      'getPlatformStats'
    );
  },

  // Registration requests
  async createRegistrationRequest(request: any) {
    return safeDbOperation(
      async () => {
        // Validation des données obligatoires
        const requiredFields = ['agency_name', 'commercial_register', 'director_first_name', 'director_last_name', 'director_email', 'phone', 'city', 'address'];
        for (const field of requiredFields) {
          if (!request[field] || (typeof request[field] === 'string' && !request[field].trim())) {
            throw new Error(`Le champ ${field} est obligatoire`);
          }
        }
        
        // Validation de l'email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.director_email)) {
          throw new Error('Format d\'email invalide');
        }
        
        // Validation du téléphone
        if (!/^(\+225)?[0-9\s-]{8,15}$/.test(request.phone)) {
          throw new Error('Format de téléphone invalide');
        }
        
        console.log('📝 Tentative d\'envoi de la demande d\'inscription:', request);
        
        // Créer la demande sans authentification (accès public)
        const { data, error } = await supabase!
          .from('agency_registration_requests')
          .insert(request)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Erreur Supabase détaillée:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Messages d'erreur spécifiques
          if (error.code === '23505') {
            throw new Error('Cette agence ou cet email existe déjà');
          } else if (error.code === '42501' || error.code === 'PGRST301' || error.message.includes('permission denied')) {
            throw new Error('Erreur d\'authentification - passage en mode démo');
          } else if (error.code === 'PGRST301') {
            throw new Error('Erreur d\'authentification');
          } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            throw new Error('Problème de connexion réseau - veuillez réessayer');
          } else {
            throw new Error(`Erreur base de données: ${error.message}`);
          }
        }
        
        console.log('✅ Demande d\'inscription créée avec succès:', data);
        return data;
      },
      (() => {
        const demoRequest = {
          id: generateDemoId(),
          ...request,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        
        // Sauvegarder en localStorage pour la démo
        const existingRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        existingRequests.push(demoRequest);
        localStorage.setItem('demo_registration_requests', JSON.stringify(existingRequests));
        
        return demoRequest;
      })(),
      'createRegistrationRequest'
    );
  },

  async getRegistrationRequests() {
    return safeDbOperation(
      async () => {
        const { data, error } = await Promise.race([
          supabase!
            .from('agency_registration_requests')
            .select('*')
            .order('created_at', { ascending: false }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        if (error) {
          console.error('Error fetching registration requests:', error);
          throw error;
        }
        
        // Combiner les vraies demandes avec les demandes démo
        const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        return [...((data as any) || []), ...demoRequests];
      },
      JSON.parse(localStorage.getItem('demo_registration_requests') || '[]'),
      'getRegistrationRequests'
    );
  },

  async updateRegistrationRequest(id: string, updates: any) {
    return safeDbOperation(
      async () => {
        // Vérifier si c'est un ID de démo
        if (id.startsWith('demo-') || id.length !== 36) {
          console.log('🔄 Mise à jour d\'une demande démo:', id);
          const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
          const updatedRequests = demoRequests.map((req: any) => 
            req.id === id ? { ...req, ...updates } : req
          );
          localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
          return { id, ...updates };
        }
        
        console.log('📝 Mise à jour de la demande:', id, updates);
        
        const { data, error } = await Promise.race([
          supabase!
            .from('agency_registration_requests')
            .update(updates)
            .eq('id', id)
            .select()
            .single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        
        if (error) {
          console.error('❌ Erreur Supabase lors de la mise à jour:', error);
          
          // Messages d'erreur spécifiques
          if (error.code === '42501' || error.message.includes('permission denied')) {
            throw new Error('Permissions insuffisantes');
          } else if (error.code === 'PGRST116') {
            throw new Error('Demande non trouvée');
          } else {
            throw new Error(`Erreur base de données: ${error.message}`);
          }
        }
        
        console.log('✅ Demande mise à jour avec succès:', data);
        return data;
      },
      (() => {
        // Fallback vers le mode démo
        const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        const updatedRequests = demoRequests.map((req: any) => 
          req.id === id ? { ...req, ...updates } : req
        );
        localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
        return { id, ...updates };
      })(),
      'updateRegistrationRequest'
    );
  },

  // Get all agencies for admin management
  async getAllAgencies() {
    return safeDbOperation(
      async () => {
        // Fetch agencies and subscriptions separately
        const [agenciesResult, subscriptionsResult] = await Promise.all([
          Promise.race([
            supabase!
              .from('agencies')
              .select('*')
              .order('created_at', { ascending: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]),
          Promise.race([
            supabase!
              .from('agency_subscriptions')
              .select('agency_id, plan_type, status, monthly_fee, next_payment_date'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ])
        ]);

        if ((agenciesResult as any).error || (subscriptionsResult as any).error) {
          console.error('Error fetching agencies or subscriptions:', (agenciesResult as any).error || (subscriptionsResult as any).error);
          throw new Error('Erreur lors du chargement des agences');
        }

        const agencies = (agenciesResult as any).data || [];
        const subscriptions = (subscriptionsResult as any).data || [];

        // Enrichir avec les statistiques et les informations du directeur
        const enrichedAgencies = await Promise.all(
          agencies.map(async (agency: any) => {
            try {
              const stats = await this.getDashboardStats(agency.id);
              const subscription = subscriptions.find((sub: any) => sub.agency_id === agency.id);
              
              return {
                ...agency,
                stats,
                subscription_status: subscription?.status || 'trial',
                plan_type: subscription?.plan_type || 'basic',
                monthly_fee: subscription?.monthly_fee || 0,
                next_payment_date: subscription?.next_payment_date,
                director_name: null // Simplified for now
              };
            } catch (error) {
              console.error(`Error fetching stats for agency ${agency.id}:`, error);
              const subscription = subscriptions.find((sub: any) => sub.agency_id === agency.id);
              return {
                ...agency,
                stats: null,
                subscription_status: subscription?.status || 'trial',
                plan_type: subscription?.plan_type || 'basic',
                monthly_fee: subscription?.monthly_fee || 0,
                next_payment_date: subscription?.next_payment_date,
                director_name: null
              };
            }
          })
        );

        return enrichedAgencies;
      },
      [],
      'getAllAgencies'
    );
  },

  // Get recent agencies for admin dashboard
  async getRecentAgencies() {
    return safeDbOperation(
      async () => {
        const { data, error } = await Promise.race([
          supabase!
          .from('agencies')
          .select('id, name, city, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        if (error) {
          console.error('Error fetching recent agencies:', error);
          throw error;
        }
        return (data as any) || [];
      },
      [],
      'getRecentAgencies'
    );
  },

  // Get system alerts based on real data
  async getSystemAlerts() {
    return safeDbOperation(
      async () => {
        const alerts = [];

        // Check for overdue subscriptions with timeout
        const { data: overdueAgencies, error: overdueError } = await Promise.race([
          supabase!
            .from('agency_subscriptions')
            .select('agency_id')
            .eq('status', 'overdue'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        if (overdueError) {
          console.error('Error checking overdue agencies:', overdueError);
        } else if ((overdueAgencies as any) && (overdueAgencies as any).length > 0) {
          alerts.push({
            type: 'warning',
            title: `${(overdueAgencies as any).length} agence(s) en retard de paiement`,
            description: 'Suspension automatique programmée'
          });
        }

        // Check for suspended agencies with timeout
        const { data: suspendedSubscriptions, error: suspendedError } = await Promise.race([
          supabase!
            .from('agency_subscriptions')
            .select('agency_id')
            .eq('status', 'suspended'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        if (suspendedError) {
          console.error('Error checking suspended agencies:', suspendedError);
        } else if ((suspendedSubscriptions as any) && (suspendedSubscriptions as any).length > 0) {
          alerts.push({
            type: 'error',
            title: `${(suspendedSubscriptions as any).length} agence(s) suspendue(s)`,
            description: 'Impayés confirmés'
          });
        }

        // If no alerts, show system operational
        if (alerts.length === 0) {
          alerts.push({
            type: 'success',
            title: 'Système opérationnel',
            description: 'Tous les services fonctionnent normalement'
          });
        }

        return alerts;
      },
      [{
        type: isSupabaseConfigured ? 'success' : 'warning',
        title: isSupabaseConfigured ? 'Mode hors ligne' : 'Configuration Supabase requise',
        description: isSupabaseConfigured ? 'Dashboard admin en mode local' : 'Veuillez configurer les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY'
      }],
      'getSystemAlerts'
    );
  },

  // Get all subscriptions for admin management
  async getAllSubscriptions() {
    return safeDbOperation(
      async () => {
        // Fetch subscriptions and agencies separately
        const [subscriptionsResult, agenciesResult] = await Promise.all([
          Promise.race([
            supabase!
              .from('agency_subscriptions')
              .select('*')
              .order('created_at', { ascending: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]),
          Promise.race([
            supabase!
              .from('agencies')
              .select('id, name, email'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ])
        ]);

        if ((subscriptionsResult as any).error || (agenciesResult as any).error) {
          console.error('Error fetching subscriptions or agencies:', (subscriptionsResult as any).error || (agenciesResult as any).error);
          throw error;
        }

        const subscriptions = (subscriptionsResult as any).data || [];
        const agencies = (agenciesResult as any).data || [];

        // Manually combine the data
        const enrichedSubscriptions = subscriptions.map((sub: any) => {
          const agency = agencies.find((a: any) => a.id === sub.agency_id);
          const daysUntilDue = sub.next_payment_date 
            ? Math.ceil((new Date(sub.next_payment_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          return {
            ...sub,
            agency_name: agency?.name || 'Agence inconnue',
            agency_email: agency?.email,
            days_until_due: daysUntilDue,
            total_paid: 0, // À calculer depuis l'historique des paiements
            payment_history: sub.payment_history || []
          };
        });

        return enrichedSubscriptions;
      },
      [],
      'getAllSubscriptions'
    );
  },

  // Toggle agency status
  async toggleAgencyStatus(agencyId: string) {
    return safeDbOperation(
      async () => {
        // Get current status
        const { data: subscription, error: fetchError } = await supabase!
          .from('agency_subscriptions')
          .select('status')
          .eq('id', agencyId)
          .single();

        if (fetchError) throw fetchError;

        const newStatus = subscription.status === 'active' ? 'suspended' : 'active';

        const { error } = await supabase!
          .from('agency_subscriptions')
          .update({ status: newStatus })
          .eq('agency_id', agencyId);

        if (error) throw error;
        return { success: true };
      },
      { success: false },
      'toggleAgencyStatus'
    );
  },

  // Owners
  async createOwner(owner: any) {
    return safeDbOperation(
      async () => {
        // Validation stricte des données obligatoires
        const requiredFields = ['first_name', 'last_name', 'phone', 'agency_id', 'address', 'city'];
        for (const field of requiredFields) {
          if (!owner[field] || (typeof owner[field] === 'string' && !owner[field].trim())) {
            throw new Error(`Le champ ${field} est obligatoire`);
          }
        }
        
        // Validation des types de données
        if (typeof owner.children_count !== 'number' || owner.children_count < 0) {
          throw new Error('Le nombre d\'enfants doit être un nombre positif');
        }
        
        // Validation des énumérations
        const validPropertyTitles = ['attestation_villageoise', 'lettre_attribution', 'permis_habiter', 'acd', 'tf', 'cpf', 'autres'];
        if (!validPropertyTitles.includes(owner.property_title)) {
          throw new Error('Type de titre de propriété invalide');
        }
        
        const validMaritalStatuses = ['celibataire', 'marie', 'divorce', 'veuf'];
        if (!validMaritalStatuses.includes(owner.marital_status)) {
          throw new Error('Situation matrimoniale invalide');
        }
        
        console.log('📝 Tentative de création du propriétaire:', owner);
        
        const { data, error } = await supabase!
          .from('owners')
          .insert(owner)
          .select()
          .single();
          
        if (error) {
          console.error('❌ Erreur Supabase:', error);
          
          // Messages d'erreur spécifiques
          if (error.code === '23505') {
            throw new Error('Ce propriétaire existe déjà (téléphone en double)');
          } else if (error.code === '23503') {
            throw new Error('Agence non trouvée');
          } else if (error.code === '42501' || error.message.includes('permission denied')) {
            throw new Error('Permissions insuffisantes');
          } else if (error.code === 'PGRST301') {
            throw new Error('Erreur d\'authentification - veuillez vous reconnecter');
          } else {
            throw new Error(`Erreur base de données: ${error.message}`);
          }
        }
        
        console.log('✅ Propriétaire créé avec succès:', data);
        return data;
      },
      {
        id: `owner_${Date.now()}`,
        ...owner,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      'createOwner'
    );
  },

  async getOwners(agencyId: string) {
    return safeDbOperation(
      async () => {
        if (!agencyId) {
          throw new Error('ID d\'agence manquant');
        }
        
        const { data, error } = await supabase!
          .from('owners')
          .select('*')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('❌ Erreur lors de la récupération des propriétaires:', error);
          throw new Error(`Impossible de charger les propriétaires: ${error.message}`);
        }
        
        return data || [];
      },
      [],
      'getOwners'
    );
  },

  async updateOwner(id: string, updates: any) {
    return safeDbOperation(
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
      { id, ...updates },
      'updateOwner'
    );
  },

  async deleteOwner(id: string) {
    return safeDbOperation(
      async () => {
        const { error } = await supabase!
          .from('owners')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      { success: true },
      'deleteOwner'
    );
  },

  async searchOwnersHistory(searchTerm: string) {
    return safeDbOperation(
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
        return data;
      },
      [],
      'searchOwnersHistory'
    );
  },

  // Properties
  async createProperty(property: any) {
    return safeDbOperation(
      async () => {
        // Validation des données obligatoires
        if (!property.title || !property.owner_id || !property.agency_id) {
          throw new Error('Données propriété manquantes');
        }
        
        const { data, error } = await supabase!
          .from('properties')
          .insert(property)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      {
        id: `property_${Date.now()}`,
        ...property,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      'createProperty'
    );
  },

  async getProperties(agencyId: string) {
    return safeDbOperation(
      async () => {
        if (!agencyId) throw new Error('Agency ID manquant');
        
        const { data, error } = await supabase!
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
      [],
      'getProperties'
    );
  },

  async updateProperty(id: string, updates: any) {
    return safeDbOperation(
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
      { id, ...updates },
      'updateProperty'
    );
  },

  async deleteProperty(id: string) {
    return safeDbOperation(
      async () => {
        const { error } = await supabase!
          .from('properties')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      { success: true },
      'deleteProperty'
    );
  },

  // Tenants
  async createTenant(tenant: any) {
    return safeDbOperation(
      async () => {
        // Validation des données obligatoires
        if (!tenant.first_name || !tenant.last_name || !tenant.phone || !tenant.agency_id) {
          throw new Error('Données locataire manquantes');
        }
        
        const { data, error } = await supabase!
          .from('tenants')
          .insert(tenant)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      {
        id: `tenant_${Date.now()}`,
        ...tenant,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      'createTenant'
    );
  },

  async getTenants(agencyId: string) {
    return safeDbOperation(
      async () => {
        if (!agencyId) throw new Error('Agency ID manquant');
        
        const { data, error } = await supabase!
          .from('tenants')
          .select('*')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      [],
      'getTenants'
    );
  },

  async updateTenant(id: string, updates: any) {
    return safeDbOperation(
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
      { id, ...updates },
      'updateTenant'
    );
  },

  async deleteTenant(id: string) {
    return safeDbOperation(
      async () => {
        const { error } = await supabase!
          .from('tenants')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      { success: true },
      'deleteTenant'
    );
  },

  async searchTenantsHistory(searchTerm: string, paymentStatus?: string) {
    return safeDbOperation(
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
        return data;
      },
      [],
      'searchTenantsHistory'
    );
  },

  // Contracts
  async createContract(contract: any) {
    return safeDbOperation(
      async () => {
        // Validation complète des données obligatoires
        const requiredFields = ['agency_id', 'type', 'start_date', 'commission_rate', 'terms'];
        for (const field of requiredFields) {
          if (!contract[field]) {
            throw new Error(`Le champ ${field} est obligatoire pour le contrat`);
          }
        }
        
        // Validation spécifique par type
        if (contract.type === 'gestion') {
          if (!contract.owner_id) {
            throw new Error('ID propriétaire obligatoire pour contrat de gestion');
          }
        } else if (contract.type === 'location') {
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
        
        console.log('📝 Création contrat avec données validées:', contract);
        
        const { data, error } = await supabase!
          .from('contracts')
          .insert(contract)
          .select()
          .single();
          
        if (error) {
          console.error('❌ Erreur création contrat Supabase:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Messages d'erreur spécifiques
          if (error.code === '23505') {
            throw new Error('Ce contrat existe déjà');
          } else if (error.code === '23503') {
            throw new Error('Référence invalide (agence, propriétaire ou locataire non trouvé)');
          } else if (error.code === '42501' || error.message.includes('permission denied')) {
            throw new Error('Permissions insuffisantes pour créer le contrat');
          } else if (error.message.includes('Invalid API key')) {
            throw new Error('Configuration API invalide - contrat créé en mode local');
          } else {
            throw new Error(`Erreur base de données: ${error.message}`);
          }
        }
        
        console.log('✅ Contrat créé avec succès en base:', data);
        return data;
      },
      {
        id: generateDemoId(),
        ...contract,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      'createContract'
    );
  },

  async getContracts(agencyId: string) {
    return safeDbOperation(
      async () => {
        if (!agencyId) throw new Error('Agency ID manquant');
        
        const { data, error } = await supabase!
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
      [],
      'getContracts'
    );
  },

  async updateContract(id: string, updates: any) {
    return safeDbOperation(
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
      { id, ...updates },
      'updateContract'
    );
  },

  async deleteContract(id: string) {
    return safeDbOperation(
      async () => {
        const { error } = await supabase!
          .from('contracts')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      { success: true },
      'deleteContract'
    );
  },

  // Announcements
  async createAnnouncement(announcement: any) {
    return safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('announcements')
          .insert(announcement)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      { id: generateDemoId(), ...announcement, created_at: new Date().toISOString() },
      'createAnnouncement'
    );
  },

  async getAnnouncements() {
    return safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('announcements')
          .select(`
            *,
            agencies(name),
            properties(title, location)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      [],
      'getAnnouncements'
    );
  },

  // Messages
  async createMessage(message: any) {
    return safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('messages')
          .insert(message)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      { id: generateDemoId(), ...message, created_at: new Date().toISOString() },
      'createMessage'
    );
  },

  async getMessages(userId: string) {
    return safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('messages')
          .select(`
            *,
            sender:users!sender_id(first_name, last_name),
            receiver:users!receiver_id(first_name, last_name)
          `)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      [],
      'getMessages'
    );
  },

  // Notifications
  async createNotification(notification: any) {
    return safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('notifications')
          .insert(notification)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      { id: generateDemoId(), ...notification, created_at: new Date().toISOString() },
      'createNotification'
    );
  },

  async getNotifications(userId: string) {
    return safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      [],
      'getNotifications'
    );
  },

  async markNotificationAsRead(id: string) {
    return safeDbOperation(
      async () => {
        const { data, error } = await supabase!
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      { id, is_read: true },
      'markNotificationAsRead'
    );
  }
};