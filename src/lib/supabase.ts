import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configuration Supabase PRODUCTION:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length,
  environment: import.meta.env.MODE
});

// FORCER LA CONFIGURATION PRODUCTION
export const supabase = createClient(
  'https://myqrdndqphfpzwadsrci.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cXJkbmRxcGhmcHp3YWRzcmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODIzMzIsImV4cCI6MjA3MDY1ODMzMn0.vG7GmNNlzE7-i0bJeMTEXX0Ho9V7nCssD0SmWfDExfE',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

console.log('✅ Client Supabase PRODUCTION créé avec succès');

// Database service functions - PRODUCTION UNIQUEMENT
export const dbService = {
  // Owners
  async createOwner(owner: any) {
    console.log('🔄 PRODUCTION - Création propriétaire:', owner);
    
    if (!owner.agency_id) {
      throw new Error('agency_id manquant dans les données');
    }
    
    if (!owner.first_name || !owner.last_name || !owner.phone) {
      throw new Error('Champs obligatoires manquants: first_name, last_name, phone');
    }
    
    const { data, error } = await supabase
      .from('owners')
      .insert(owner)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur Supabase insertion:', error);
      throw error;
    }
    
    console.log('✅ Propriétaire créé en PRODUCTION:', data);
    return data;
  },

  async getOwners(agencyId?: string) {
    console.log('🔄 PRODUCTION - Récupération propriétaires pour agence:', agencyId);
    
    let query = supabase.from('owners').select('*');
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération propriétaires:', error);
      throw error;
    }
    
    console.log('✅ Propriétaires récupérés:', data?.length || 0);
    return data || [];
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
    
    console.log('✅ Propriétaire mis à jour:', data);
    return data;
  },

  async deleteOwner(id: string) {
    console.log('🔄 PRODUCTION - Suppression propriétaire:', id);
    
    const { error } = await supabase.from('owners').delete().eq('id', id);
    
    if (error) {
      console.error('❌ Erreur suppression propriétaire:', error);
      throw error;
    }
    
    console.log('✅ Propriétaire supprimé');
    return { success: true };
  },

  // Tenants
  async createTenant(tenant: any) {
    console.log('🔄 PRODUCTION - Création locataire:', tenant);
    
    if (!tenant.agency_id) {
      throw new Error('agency_id manquant');
    }
    
    const { data, error } = await supabase
      .from('tenants')
      .insert(tenant)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur création locataire:', error);
      throw error;
    }
    
    console.log('✅ Locataire créé en PRODUCTION:', data);
    return data;
  },

  async getTenants(agencyId?: string) {
    console.log('🔄 PRODUCTION - Récupération locataires pour agence:', agencyId);
    
    let query = supabase.from('tenants').select('*');
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération locataires:', error);
      throw error;
    }
    
    console.log('✅ Locataires récupérés:', data?.length || 0);
    return data || [];
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
    
    console.log('✅ Locataire mis à jour:', data);
    return data;
  },

  async deleteTenant(id: string) {
    console.log('🔄 PRODUCTION - Suppression locataire:', id);
    
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    
    if (error) {
      console.error('❌ Erreur suppression locataire:', error);
      throw error;
    }
    
    console.log('✅ Locataire supprimé');
    return { success: true };
  },

  // Properties
  async createProperty(property: any) {
    console.log('🔄 PRODUCTION - Création propriété:', property);
    
    if (!property.agency_id) {
      throw new Error('agency_id manquant');
    }
    
    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur création propriété:', error);
      throw error;
    }
    
    console.log('✅ Propriété créée en PRODUCTION:', data);
    return data;
  },

  async getProperties(agencyId?: string) {
    console.log('🔄 PRODUCTION - Récupération propriétés pour agence:', agencyId);
    
    let query = supabase.from('properties').select('*');
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération propriétés:', error);
      throw error;
    }
    
    console.log('✅ Propriétés récupérées:', data?.length || 0);
    return data || [];
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
    
    console.log('✅ Propriété mise à jour:', data);
    return data;
  },

  async deleteProperty(id: string) {
    console.log('🔄 PRODUCTION - Suppression propriété:', id);
    
    const { error } = await supabase.from('properties').delete().eq('id', id);
    
    if (error) {
      console.error('❌ Erreur suppression propriété:', error);
      throw error;
    }
    
    console.log('✅ Propriété supprimée');
    return { success: true };
  },

  // Contracts
  async createContract(contract: any) {
    console.log('🔄 PRODUCTION - Création contrat:', contract);
    
    if (!contract.agency_id) {
      throw new Error('agency_id manquant');
    }
    
    const { data, error } = await supabase
      .from('contracts')
      .insert(contract)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur création contrat:', error);
      throw error;
    }
    
    console.log('✅ Contrat créé en PRODUCTION:', data);
    return data;
  },

  async getContracts(agencyId?: string) {
    console.log('🔄 PRODUCTION - Récupération contrats pour agence:', agencyId);
    
    let query = supabase.from('contracts').select('*');
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération contrats:', error);
      throw error;
    }
    
    console.log('✅ Contrats récupérés:', data?.length || 0);
    return data || [];
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
    
    console.log('✅ Contrat mis à jour:', data);
    return data;
  },

  async deleteContract(id: string) {
    console.log('🔄 PRODUCTION - Suppression contrat:', id);
    
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    
    if (error) {
      console.error('❌ Erreur suppression contrat:', error);
      throw error;
    }
    
    console.log('✅ Contrat supprimé');
    return { success: true };
  },

  // Users
  async createUser(userData: any) {
    console.log('🔄 PRODUCTION - Création utilisateur:', userData);
    
    // Créer d'abord dans Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
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

    // Puis créer le profil
    const { data: user, error: userError } = await supabase
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

    if (userError) {
      console.error('❌ Erreur création profil:', userError);
      throw userError;
    }
    
    console.log('✅ Utilisateur créé en PRODUCTION:', user);
    return user;
  },

  async getUsers(agencyId?: string) {
    console.log('🔄 PRODUCTION - Récupération utilisateurs pour agence:', agencyId);
    
    let query = supabase.from('users').select('*');
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération utilisateurs:', error);
      throw error;
    }
    
    console.log('✅ Utilisateurs récupérés:', data?.length || 0);
    return data || [];
  },

  async updateUser(id: string, updates: any) {
    console.log('🔄 PRODUCTION - Mise à jour utilisateur:', id);
    
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur mise à jour utilisateur:', error);
      throw error;
    }
    
    console.log('✅ Utilisateur mis à jour:', data);
    return data;
  },

  async deleteUser(id: string) {
    console.log('🔄 PRODUCTION - Suppression utilisateur:', id);
    
    // Supprimer de Supabase Auth et de la table users
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) console.warn('Erreur suppression auth:', authError);
    
    const { error } = await supabase.from('users').delete().eq('id', id);
    
    if (error) {
      console.error('❌ Erreur suppression utilisateur:', error);
      throw error;
    }
    
    console.log('✅ Utilisateur supprimé');
    return { success: true };
  },

  // Agency
  async getAgency(id: string) {
    console.log('🔄 PRODUCTION - Récupération agence:', id);
    
    if (!id) throw new Error('ID agence manquant');
    
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('❌ Erreur récupération agence:', error);
      throw error;
    }
    
    console.log('✅ Agence récupérée:', data);
    return data;
  },

  // Dashboard stats
  async getDashboardStats(agencyId: string) {
    console.log('🔄 PRODUCTION - Calcul stats dashboard pour agence:', agencyId);
    
    if (!agencyId) throw new Error('Agency ID manquant');
    
    const [propertiesResult, ownersResult, tenantsResult, contractsResult] = await Promise.all([
      supabase.from('properties').select('id', { count: 'exact' }).eq('agency_id', agencyId),
      supabase.from('owners').select('id', { count: 'exact' }).eq('agency_id', agencyId),
      supabase.from('tenants').select('id', { count: 'exact' }).eq('agency_id', agencyId),
      supabase.from('contracts').select('id, monthly_rent, status', { count: 'exact' }).eq('agency_id', agencyId)
    ]);

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
    
    console.log('✅ Stats dashboard calculées:', stats);
    return stats;
  },

  // Registration requests
  async createRegistrationRequest(request: any) {
    console.log('🔄 PRODUCTION - Création demande inscription:', request);
    
    const { data, error } = await supabase
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
      
    if (error) {
      console.error('❌ Erreur création demande:', error);
      throw error;
    }
    
    console.log('✅ Demande inscription créée:', data);
    return data;
  },

  // Admin functions
  async getAllAgencies() {
    console.log('🔄 PRODUCTION - Récupération toutes agences');
    
    const [agenciesResult, subscriptionsResult] = await Promise.all([
      supabase.from('agencies').select('*').order('created_at', { ascending: false }),
      supabase.from('agency_subscriptions').select('agency_id, plan_type, status, monthly_fee, next_payment_date')
    ]);

    if (agenciesResult.error) throw agenciesResult.error;
    if (subscriptionsResult.error) throw subscriptionsResult.error;

    const agencies = agenciesResult.data || [];
    const subscriptions = subscriptionsResult.data || [];

    const result = agencies.map((agency: any) => {
      const subscription = subscriptions.find((sub: any) => sub.agency_id === agency.id);
      return {
        ...agency,
        subscription_status: subscription?.status || 'trial',
        plan_type: subscription?.plan_type || 'basic',
        monthly_fee: subscription?.monthly_fee || 25000,
        next_payment_date: subscription?.next_payment_date,
      };
    });
    
    console.log('✅ Agences récupérées:', result.length);
    return result;
  },

  async getAllSubscriptions() {
    console.log('🔄 PRODUCTION - Récupération tous abonnements');
    
    const [subscriptionsResult, agenciesResult] = await Promise.all([
      supabase.from('agency_subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('agencies').select('id, name, email')
    ]);

    if (subscriptionsResult.error) throw subscriptionsResult.error;
    if (agenciesResult.error) throw agenciesResult.error;

    const subscriptions = subscriptionsResult.data || [];
    const agencies = agenciesResult.data || [];

    const result = subscriptions.map((sub: any) => {
      const agency = agencies.find((a: any) => a.id === sub.agency_id);
      return {
        ...sub,
        agency_name: agency?.name || 'Agence inconnue',
        agency_email: agency?.email,
      };
    });
    
    console.log('✅ Abonnements récupérés:', result.length);
    return result;
  },

  async getPlatformStats() {
    console.log('🔄 PRODUCTION - Calcul stats plateforme');
    
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

    const stats = {
      totalAgencies: agenciesResult.count || 0,
      activeAgencies,
      totalProperties: propertiesResult.count || 0,
      totalContracts: contractsResult.count || 0,
      totalRevenue,
      monthlyGrowth: 12,
      subscriptionRevenue
    };
    
    console.log('✅ Stats plateforme calculées:', stats);
    return stats;
  },

  async getRecentAgencies() {
    console.log('🔄 PRODUCTION - Récupération agences récentes');
    
    const { data, error } = await supabase
      .from('agencies')
      .select('id, name, city, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Erreur récupération agences récentes:', error);
      throw error;
    }
    
    console.log('✅ Agences récentes récupérées:', data?.length || 0);
    return data || [];
  },

  async getSystemAlerts() {
    console.log('🔄 PRODUCTION - Récupération alertes système');
    
    const alerts = [];
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

    if (alerts.length === 0) {
      alerts.push({
        type: 'success',
        title: 'Système opérationnel',
        description: 'Tous les services fonctionnent normalement'
      });
    }

    console.log('✅ Alertes système récupérées:', alerts.length);
    return alerts;
  },

  // Search functions
  async searchOwnersHistory(searchTerm: string) {
    console.log('🔄 PRODUCTION - Recherche historique propriétaires:', searchTerm);
    
    const { data, error } = await supabase
      .from('owners')
      .select(`
        *,
        agencies(name)
      `)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(50);
    
    if (error) {
      console.error('❌ Erreur recherche propriétaires:', error);
      throw error;
    }
    
    console.log('✅ Propriétaires trouvés:', data?.length || 0);
    return data || [];
  },

  async searchTenantsHistory(searchTerm: string, paymentStatus?: string) {
    console.log('🔄 PRODUCTION - Recherche historique locataires:', searchTerm);
    
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
    
    if (error) {
      console.error('❌ Erreur recherche locataires:', error);
      throw error;
    }
    
    console.log('✅ Locataires trouvés:', data?.length || 0);
    return data || [];
  },

  // Financial statements
  async getFinancialStatements(entityId: string, entityType: 'owner' | 'tenant', period: string) {
    console.log('🔄 PRODUCTION - Récupération états financiers:', entityId, entityType, period);
    
    const { data, error } = await supabase
      .from('financial_statements')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('❌ Erreur récupération états financiers:', error);
      throw error;
    }
    
    console.log('✅ États financiers récupérés:', data);
    return data;
  },

  // Rent receipts
  async createRentReceipt(receipt: any) {
    console.log('🔄 PRODUCTION - Création quittance:', receipt);
    
    const { data, error } = await supabase
      .from('rent_receipts')
      .insert(receipt)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur création quittance:', error);
      throw error;
    }
    
    console.log('✅ Quittance créée en PRODUCTION:', data);
    return data;
  },

  async getRentReceipts(agencyId?: string) {
    console.log('🔄 PRODUCTION - Récupération quittances pour agence:', agencyId);
    
    let query = supabase.from('rent_receipts').select('*');
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération quittances:', error);
      throw error;
    }
    
    console.log('✅ Quittances récupérées:', data?.length || 0);
    return data || [];
  },

  // Announcements
  async createAnnouncement(announcement: any) {
    console.log('🔄 PRODUCTION - Création annonce:', announcement);
    
    const { data, error } = await supabase
      .from('announcements')
      .insert(announcement)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur création annonce:', error);
      throw error;
    }
    
    console.log('✅ Annonce créée en PRODUCTION:', data);
    return data;
  },

  async getAnnouncements(excludeAgencyId?: string) {
    console.log('🔄 PRODUCTION - Récupération annonces (excluant agence):', excludeAgencyId);
    
    let query = supabase.from('announcements').select('*').eq('is_active', true);
    if (excludeAgencyId) {
      query = query.neq('agency_id', excludeAgencyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération annonces:', error);
      throw error;
    }
    
    console.log('✅ Annonces récupérées:', data?.length || 0);
    return data || [];
  },

  // Notifications
  async createNotification(notification: any) {
    console.log('🔄 PRODUCTION - Création notification:', notification);
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur création notification:', error);
      throw error;
    }
    
    console.log('✅ Notification créée en PRODUCTION:', data);
    return data;
  },

  async getNotifications(userId: string) {
    console.log('🔄 PRODUCTION - Récupération notifications pour utilisateur:', userId);
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération notifications:', error);
      throw error;
    }
    
    console.log('✅ Notifications récupérées:', data?.length || 0);
    return data || [];
  },

  async updateNotification(id: string, updates: any) {
    console.log('🔄 PRODUCTION - Mise à jour notification:', id);
    
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur mise à jour notification:', error);
      throw error;
    }
    
    console.log('✅ Notification mise à jour:', data);
    return data;
  },

  async deleteNotification(id: string) {
    console.log('🔄 PRODUCTION - Suppression notification:', id);
    
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    
    if (error) {
      console.error('❌ Erreur suppression notification:', error);
      throw error;
    }
    
    console.log('✅ Notification supprimée');
    return { success: true };
  },

  // Real-time subscriptions
  subscribeToChanges(table: string, callback: (payload: any) => void) {
    console.log(`📡 PRODUCTION - Souscription temps réel pour table: ${table}`);
    
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