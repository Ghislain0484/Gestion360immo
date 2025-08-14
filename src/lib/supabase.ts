import { createClient } from '@supabase/supabase-js';
import { generateDemoId } from '../utils/uuidGenerator';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification des variables d'environnement
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://votre-projet.supabase.co' && 
  !supabaseAnonKey.includes('...');

if (!isSupabaseConfigured) {
  console.warn('Supabase not configured - using offline mode');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database service functions
export const dbService = {
  // Agencies
  async createAgency(agency: any) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('agencies')
      .insert(agency)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAgency(id: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Users
  async createUser(user: any) {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Validation des données
    if (!user.email || !user.first_name || !user.last_name) {
      throw new Error('Données utilisateur manquantes');
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getUsers(agencyId: string) {
    if (!supabase) return [];
    if (!agencyId) throw new Error('Agency ID manquant');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('agency_id', agencyId);
    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: any) {
    if (!supabase) throw new Error('Supabase not configured');
    if (!id || !updates) throw new Error('Paramètres manquants');
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
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
    if (!supabase) {
      return {
        totalProperties: 0,
        totalOwners: 0,
        totalTenants: 0,
        totalContracts: 0,
        monthlyRevenue: 0,
        activeContracts: 0,
        occupancyRate: 0
      };
    }
    
    try {
      // Get real stats from database
      const [propertiesResult, ownersResult, tenantsResult, contractsResult] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact' }).eq('agency_id', agencyId),
        supabase.from('owners').select('id', { count: 'exact' }).eq('agency_id', agencyId),
        supabase.from('tenants').select('id', { count: 'exact' }).eq('agency_id', agencyId),
        supabase.from('contracts').select('id, monthly_rent, status', { count: 'exact' }).eq('agency_id', agencyId)
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
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Admin platform stats
  async getPlatformStats() {
    // Return default stats immediately if Supabase is not configured
    if (!supabase || !isSupabaseConfigured) {
      return {
        totalAgencies: 0,
        activeAgencies: 0,
        totalProperties: 0,
        totalContracts: 0,
        totalRevenue: 0,
        monthlyGrowth: 0,
        subscriptionRevenue: 0
      };
    }
    
    try {
      // Get basic counts with timeout and error handling
      const [agenciesResult, subscriptionsResult] = await Promise.all([
        Promise.race([
          supabase.from('agencies').select('id', { count: 'exact' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]),
        Promise.race([
          supabase.from('agency_subscriptions').select('agency_id, status', { count: 'exact' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ])
      ]);
      
      const [propertiesResult, contractsResult] = await Promise.all([
        Promise.race([
          supabase.from('properties').select('id', { count: 'exact' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]),
        Promise.race([
          supabase.from('contracts').select('id, commission_amount', { count: 'exact' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ])
      ]);
      
      const subscriptionRevenueResult = await Promise.race([
        supabase.from('agency_subscriptions').select('monthly_fee, status', { count: 'exact' }),
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
    } catch (error) {
      console.warn('Cannot fetch platform stats (network/config issue):', error);
      // Return default values on network or configuration errors
      return {
        totalAgencies: 0,
        activeAgencies: 0,
        totalProperties: 0,
        totalContracts: 0,
        totalRevenue: 0,
        monthlyGrowth: 0,
        subscriptionRevenue: 0
      };
    }
  },

  // Registration requests
  async createRegistrationRequest(request: any) {
    if (!supabase) {
      // Mode démo - sauvegarder localement
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
    }
    
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
    
    try {
      console.log('Tentative d\'envoi de la demande d\'inscription:', request);
      
      // Créer la demande sans authentification (accès public)
      const { data, error } = await supabase
        .from('agency_registration_requests')
        .insert(request)
        .select()
        .single();
      
      if (error) {
        console.error('Erreur Supabase détaillée:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Messages d'erreur spécifiques
        if (error.code === '23505') {
          throw new Error('Cette agence ou cet email existe déjà');
        } else if (error.code === '42501' || error.code === 'PGRST301' || error.message.includes('permission denied')) {
          // Fallback en mode démo si problème de permissions
          console.warn('Permissions insuffisantes, passage en mode démo');
          const demoRequest = {
            id: generateDemoId(),
            ...request,
            status: 'pending',
            created_at: new Date().toISOString()
          };
          
          const existingRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
          existingRequests.push(demoRequest);
          localStorage.setItem('demo_registration_requests', JSON.stringify(existingRequests));
          
          return demoRequest;
        } else if (error.code === 'PGRST301') {
          throw new Error('Erreur d\'authentification');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
          throw new Error('Problème de connexion réseau - veuillez réessayer');
        } else {
          throw new Error(`Erreur base de données: ${error.message}`);
        }
      }
      
      console.log('Demande d\'inscription créée avec succès:', data);
      return data;
    } catch (dbError: any) {
      console.error('Erreur lors de l\'insertion de la demande:', dbError);
      
      // Si c'est une erreur réseau, essayer le mode démo
      if (dbError.message?.includes('Failed to fetch') || dbError.message?.includes('network')) {
        console.warn('Erreur réseau, passage en mode démo');
        const demoRequest = {
          id: generateDemoId(),
          ...request,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        
        const existingRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        existingRequests.push(demoRequest);
        localStorage.setItem('demo_registration_requests', JSON.stringify(existingRequests));
        
        return demoRequest;
      }
      
      throw dbError;
    }
  },

  async getRegistrationRequests() {
    if (!supabase || !isSupabaseConfigured) {
      // Retourner les demandes démo si disponibles
      const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      return demoRequests;
    }
    
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('agency_registration_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      if (error) {
        console.error('Error fetching registration requests:', error);
        // Fallback vers les demandes démo
        const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        return demoRequests;
      }
      
      // Combiner les vraies demandes avec les demandes démo
      const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      return [...((data as any) || []), ...demoRequests];
    } catch (error) {
      console.warn('Cannot fetch registration requests:', error);
      // Retourner les demandes démo en cas d'erreur
      const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      return demoRequests;
    }
  },

  async updateRegistrationRequest(id: string, updates: any) {
    if (!supabase || !isSupabaseConfigured) {
      // Mode démo - mettre à jour localement
      const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      const updatedRequests = demoRequests.map((req: any) => 
        req.id === id ? { ...req, ...updates } : req
      );
      localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
      return { id, ...updates };
    }
    
    // Vérifier si c'est un ID de démo
    if (id.startsWith('demo-')) {
      console.log('Mise à jour d\'une demande démo:', id);
      const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      const updatedRequests = demoRequests.map((req: any) => 
        req.id === id ? { ...req, ...updates } : req
      );
      localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
      return { id, ...updates };
    }
    
    try {
      console.log('Mise à jour de la demande:', id, updates);
      
      const { data, error } = await Promise.race([
        supabase
          .from('agency_registration_requests')
          .update(updates)
          .eq('id', id)
          .select()
          .single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      
      if (error) {
        console.error('Erreur Supabase lors de la mise à jour:', error);
        
        // Messages d'erreur spécifiques
        if (error.code === '42501' || error.message.includes('permission denied')) {
          // Fallback vers le mode démo
          console.warn('Permissions insuffisantes, mise à jour en mode démo');
          const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
          const demoRequest = {
            id: generateDemoId(),
            ...request,
            status: 'pending',
            created_at: new Date().toISOString()
          };
          const updatedRequests = [...demoRequests, demoRequest];
          localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
          return demoRequest;
        } else if (error.code === 'PGRST116') {
          throw new Error('Demande non trouvée');
        } else {
          throw new Error(`Erreur base de données: ${error.message}`);
        }
      }
      
      console.log('Demande mise à jour avec succès:', data);
      return data;
      
    } catch (dbError: any) {
      console.error('Erreur lors de la mise à jour:', dbError);
      
      // Si c'est une erreur réseau, essayer le mode démo
      if (id.length === 36 && id.includes('-')) {
        // Vérifier si c'est un UUID de démo en localStorage
        const demoRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        const isDemoRequest = demoRequests.some((req: any) => req.id === id);
        
        if (isDemoRequest) {
        console.warn('Erreur réseau, mise à jour en mode démo');
        const updatedRequests = demoRequests.map((req: any) => 
          req.id === id ? { ...req, ...updates } : req
        );
        localStorage.setItem('demo_registration_requests', JSON.stringify(updatedRequests));
        return { id, ...updates };
        }
      }
      
      throw dbError;
    }
  },

  async deleteRegistrationRequest(id: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase
      .from('agency_registration_requests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return data;
  },

  // Get all agencies for admin management
  async getAllAgencies() {
    if (!supabase || !isSupabaseConfigured) {
      return [];
    }
    
    try {
      // Fetch agencies and subscriptions separately
      const [agenciesResult, subscriptionsResult] = await Promise.all([
        Promise.race([
          supabase
            .from('agencies')
            .select('*')
            .order('created_at', { ascending: false }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]),
        Promise.race([
          supabase
            .from('agency_subscriptions')
            .select('agency_id, plan_type, status, monthly_fee, next_payment_date'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ])
      ]);

      if (agenciesResult.error || subscriptionsResult.error) {
        console.error('Error fetching agencies or subscriptions:', agenciesResult.error || subscriptionsResult.error);
        return [];
      }

      const agencies = agenciesResult.data || [];
      const subscriptions = subscriptionsResult.data || [];

      // Enrichir avec les statistiques et les informations du directeur
      const enrichedAgencies = await Promise.all(
        agencies.map(async (agency) => {
          try {
            const stats = await this.getDashboardStats(agency.id);
            const subscription = subscriptions.find(sub => sub.agency_id === agency.id);
            
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
            const subscription = subscriptions.find(sub => sub.agency_id === agency.id);
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
    } catch (error) {
      console.warn('Cannot fetch agencies (network/config issue):', error);
      return [];
    }
  },

  // Get recent agencies for admin dashboard
  async getRecentAgencies() {
    if (!supabase || !isSupabaseConfigured) {
      return [];
    }
    
    try {
      const { data, error } = await Promise.race([
        supabase
        .from('agencies')
        .select('id, name, city, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      if (error) {
        console.error('Error fetching recent agencies:', error);
        return [];
      }
      return (data as any) || [];
    } catch (error) {
      console.warn('Cannot fetch recent agencies (network/config issue):', error);
      return [];
    }
  },

  // Get system alerts based on real data
  async getSystemAlerts() {
    if (!supabase || !isSupabaseConfigured) {
      return [{
        type: 'warning',
        title: 'Configuration Supabase requise',
        description: 'Veuillez configurer les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY'
      }];
    }
    
    try {
      const alerts = [];

      // Check for overdue subscriptions with timeout
      const { data: overdueAgencies, error: overdueError } = await Promise.race([
        supabase
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
        supabase
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
    } catch (error) {
      console.warn('Cannot fetch system alerts (network/config issue):', error);
      return [{
        type: 'success',
        title: 'Mode hors ligne',
        description: 'Dashboard admin en mode local'
      }];
    }
  },

  // Get all subscriptions for admin management
  async getAllSubscriptions() {
    if (!supabase || !isSupabaseConfigured) {
      return [];
    }
    
    try {
      // Fetch subscriptions and agencies separately
      const [subscriptionsResult, agenciesResult] = await Promise.all([
        Promise.race([
          supabase
            .from('agency_subscriptions')
            .select('*')
            .order('created_at', { ascending: false }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]),
        Promise.race([
          supabase
            .from('agencies')
            .select('id, name, email'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ])
      ]);

      if (subscriptionsResult.error || agenciesResult.error) {
        console.error('Error fetching subscriptions or agencies:', subscriptionsResult.error || agenciesResult.error);
        return [];
      }

      const subscriptions = subscriptionsResult.data || [];
      const agencies = agenciesResult.data || [];

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
    } catch (error) {
      console.warn('Cannot fetch subscriptions (network/config issue):', error);
      return [];
    }
  },

  // Toggle agency status
  async toggleAgencyStatus(agencyId: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Get current status
    const { data: subscription, error: fetchError } = await supabase
      .from('agency_subscriptions')
      .select('status')
      .eq('id', agencyId)
      .single();

    if (fetchError) throw fetchError;

    const newStatus = subscription.status === 'active' ? 'suspended' : 'active';

    const { error } = await supabase
      .from('agency_subscriptions')
      .update({ status: newStatus })
      .eq('agency_id', agencyId);

    if (error) throw error;
  },
  // Owners
  async createOwner(owner: any) {
    if (!supabase) {
      // Mode démonstration - créer un propriétaire fictif
      return {
        id: `owner_${Date.now()}`,
        ...owner,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
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
    
    try {
      console.log('Tentative de création du propriétaire:', owner);
      
      const { data, error } = await supabase
        .from('owners')
        .insert(owner)
        .select()
        .single();
        
      if (error) {
        console.error('Erreur Supabase:', error);
        
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
      
      console.log('Propriétaire créé avec succès:', data);
      return data;
      
    } catch (dbError) {
      console.error('Erreur lors de l\'insertion:', dbError);
      throw dbError;
    }
  },

  async getOwners(agencyId: string) {
    if (!supabase) {
      // Mode démonstration
      return [];
    }
    
    if (!agencyId) {
      throw new Error('ID d\'agence manquant');
    }
    
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Erreur lors de la récupération des propriétaires:', error);
      throw new Error(`Impossible de charger les propriétaires: ${error.message}`);
    }
    
    return data || [];
  },

  async updateOwner(id: string, updates: any) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('owners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteOwner(id: string) {
    if (!supabase) return;
    
    const { error } = await supabase
      .from('owners')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async searchOwnersHistory(searchTerm: string) {
    if (!supabase) return [];
    
    const { data, error } = await supabase
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

  // Properties
  async createProperty(property: any) {
    if (!supabase) {
      return {
        id: `property_${Date.now()}`,
        ...property,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    // Validation des données obligatoires
    if (!property.title || !property.owner_id || !property.agency_id) {
      throw new Error('Données propriété manquantes');
    }
    
    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getProperties(agencyId: string) {
    if (!supabase) return [];
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

  async updateProperty(id: string, updates: any) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProperty(id: string) {
    if (!supabase) return;
    
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Tenants
  async createTenant(tenant: any) {
    if (!supabase) {
      return {
        id: `tenant_${Date.now()}`,
        ...tenant,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    // Validation des données obligatoires
    if (!tenant.first_name || !tenant.last_name || !tenant.phone || !tenant.agency_id) {
      throw new Error('Données locataire manquantes');
    }
    
    const { data, error } = await supabase
      .from('tenants')
      .insert(tenant)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getTenants(agencyId: string) {
    if (!supabase) return [];
    if (!agencyId) throw new Error('Agency ID manquant');
    
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateTenant(id: string, updates: any) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTenant(id: string) {
    if (!supabase) return;
    
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async searchTenantsHistory(searchTerm: string, paymentStatus?: string) {
    if (!supabase) return [];
    
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
    return data;
  },

  // Contracts
  async createContract(contract: any) {
    if (!supabase) {
      // Mode démonstration - retourner un contrat fictif
      const mockContract = {
        id: `contract_${Date.now()}`,
        ...contract,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log('Contrat créé en mode démo:', mockContract);
      return mockContract;
    }
    
    // Validation des données obligatoires
    if (!contract.agency_id) {
      throw new Error('ID agence obligatoire');
    }
    
    // Pour les contrats de gestion, owner_id est obligatoire
    if (contract.type === 'gestion' && !contract.owner_id) {
      throw new Error('ID propriétaire obligatoire pour contrat de gestion');
    }
    
    // Pour les contrats de location, tenant_id est obligatoire
    if (contract.type === 'location' && !contract.tenant_id) {
      throw new Error('ID locataire obligatoire pour contrat de location');
    }
    
    try {
      const { data, error } = await supabase
        .from('contracts')
        .insert(contract)
        .select()
        .single();
      if (error) {
        console.error('Erreur création contrat Supabase:', error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }
      return data;
    } catch (dbError) {
      console.error('Erreur lors de la création du contrat:', dbError);
      throw dbError;
    }
  },

  async getContracts(agencyId: string) {
    if (!supabase) return [];
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

  async updateContract(id: string, updates: any) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteContract(id: string) {
    if (!supabase) return;
    
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Announcements
  async createAnnouncement(announcement: any) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('announcements')
      .insert(announcement)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAnnouncements() {
    if (!supabase) return [];
    
    const { data, error } = await supabase
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

  // Messages
  async createMessage(message: any) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getMessages(userId: string) {
    if (!supabase) return [];
    
    const { data, error } = await supabase
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

  // Notifications
  async createNotification(notification: any) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getNotifications(userId: string) {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markNotificationAsRead(id: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};