import { useState, useEffect } from 'react';
import { dbService, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Hook for real-time data synchronization - FORCE SUPABASE
export function useRealtimeData<T>(
  fetchFunction: (agencyId: string) => Promise<T[]>,
  tableName: string,
  dependencies: any[] = []
) {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getValidAgencyId = (): string => {
    if (!user?.agencyId) {
      throw new Error('❌ Aucune agence associée - veuillez vous reconnecter');
    }
    return user.agencyId;
  };

  const fetchData = async () => {
    try {
      const agencyId = getValidAgencyId();
      
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Chargement ${tableName} pour agence:`, agencyId);
      
      const result = await fetchFunction(agencyId);
      setData(result || []);
      
      console.log(`✅ ${tableName} chargées:`, result?.length || 0, 'éléments');
    } catch (err) {
      console.error(`❌ Erreur chargement ${tableName}:`, err);
      
      let errorMessage = 'Erreur lors du chargement des données';
      if (err instanceof Error) {
        if (err.message.includes('Invalid API key')) {
          errorMessage = '🔑 Configuration Supabase invalide - Vérifiez les variables d\'environnement sur Vercel';
        } else if (err.message.includes('permission denied')) {
          errorMessage = '🚫 Accès refusé - Vérifiez vos permissions';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = '🌐 Problème de connexion - Vérifiez votre connexion internet';
        } else if (err.message.includes('agence associée')) {
          errorMessage = '👤 Aucune agence associée - Veuillez vous reconnecter';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Configuration souscription temps réel
    let subscription: any = null;
    
    if (tableName) {
      console.log(`📡 Configuration souscription temps réel pour: ${tableName}`);
      subscription = dbService.subscribeToChanges(tableName, (payload) => {
        console.log(`📡 Mise à jour temps réel ${tableName}:`, payload);
        
        // Actualiser les données lors des changements
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
          fetchData();
        }
      });
    }

    return () => {
      if (subscription) {
        dbService.unsubscribeFromChanges(subscription);
      }
    };
  }, [user?.agencyId, tableName, ...dependencies]);

  const refetch = () => {
    fetchData();
  };

  return { data, loading, error, refetch, setData };
}

// Hook for dashboard stats - FORCE REAL DATA
export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!user?.agencyId) {
      setError('❌ Aucune agence associée');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Chargement statistiques pour agence:', user.agencyId);
      const result = await dbService.getDashboardStats(user.agencyId);
      setStats(result);
      console.log('✅ Statistiques chargées:', result);
    } catch (err) {
      console.error('❌ Erreur statistiques:', err);
      
      let errorMessage = 'Erreur lors du chargement des statistiques';
      if (err instanceof Error) {
        if (err.message.includes('Invalid API key')) {
          errorMessage = '🔑 Configuration Supabase invalide';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Configuration mises à jour temps réel dashboard
    let subscriptions: any[] = [];
    
    if (user?.agencyId) {
      const tables = ['properties', 'owners', 'tenants', 'contracts'];
      
      tables.forEach(table => {
        const subscription = dbService.subscribeToChanges(table, () => {
          console.log(`📡 Actualisation stats suite changement ${table}`);
          setTimeout(fetchStats, 500);
        });
        if (subscription) subscriptions.push(subscription);
      });
    }

    return () => {
      subscriptions.forEach(sub => dbService.unsubscribeFromChanges(sub));
    };
  }, [user?.agencyId]);

  return { stats, loading, error, refetch: fetchStats };
}

export function useSupabaseData<T>(
  fetchFunction: (agencyId: string) => Promise<T[]>,
  dependencies: any[] = []
) {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getValidAgencyId = (): string => {
    if (!user?.agencyId) {
      throw new Error('❌ Aucune agence associée - veuillez vous reconnecter');
    }
    return user.agencyId;
  };

  const fetchData = async () => {
    try {
      const agencyId = getValidAgencyId();
      
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction(agencyId);
      setData(result || []);
    } catch (err) {
      console.error('❌ Erreur chargement données:', err);
      
      let errorMessage = 'Erreur lors du chargement';
      if (err instanceof Error) {
        if (err.message.includes('Invalid API key')) {
          errorMessage = '🔑 Configuration Supabase invalide';
        } else if (err.message.includes('permission denied')) {
          errorMessage = '🚫 Accès refusé';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = '🌐 Problème de connexion';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.agencyId, ...dependencies]);

  const refetch = () => {
    fetchData();
  };

  return { data, loading, error, refetch, setData };
}

export function useSupabaseCreate<T>(
  createFunction: (data: any) => Promise<T>,
  onSuccess?: (data: T) => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: any) => {
    if (!data) {
      throw new Error('Données manquantes');
    }
    

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Création en cours:', data);
      const result = await createFunction(data);
      console.log('✅ Création réussie:', result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      console.error('❌ Erreur création:', err);
      
      let errorMessage = 'Erreur lors de la création en base';
      if (err instanceof Error) {
        if (err.message.includes('Invalid API key')) {
          errorMessage = '🔑 Configuration Supabase invalide - Vérifiez les variables d\'environnement';
        } else if (err.message.includes('permission denied')) {
          errorMessage = '🚫 Accès refusé - Vérifiez vos permissions';
        } else if (err.message.includes('duplicate key')) {
          errorMessage = '📋 Cet élément existe déjà';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}

export function useSupabaseUpdate<T>(
  updateFunction: (id: string, data: any) => Promise<T>,
  onSuccess?: (data: T) => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (id: string, data: any) => {
    if (!id || !data) {
      throw new Error('Paramètres manquants');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await updateFunction(id, data);
      onSuccess?.(result);
      return result;
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      
      let errorMessage = 'Erreur lors de la mise à jour';
      if (err instanceof Error) {
        if (err.message.includes('Invalid API key')) {
          errorMessage = '🔑 Configuration Supabase invalide';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}

export function useSupabaseDelete(
  deleteFunction: (id: string) => Promise<void>,
  onSuccess?: () => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteItem = async (id: string) => {
    if (!id) {
      throw new Error('ID manquant');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await deleteFunction(id);
      onSuccess?.();
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      
      let errorMessage = 'Erreur lors de la suppression';
      if (err instanceof Error) {
        if (err.message.includes('Invalid API key')) {
          errorMessage = '🔑 Configuration Supabase invalide';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteItem, loading, error };
}