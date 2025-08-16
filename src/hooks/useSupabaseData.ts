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

  const fetchData = async () => {
    try {
      const agencyId = user?.agencyId || 'demo_agency_001';
      
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction(agencyId);
      setData(result || []);
      
    } catch (err) {
      console.error(`Error loading ${tableName}:`, err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
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
      subscription = dbService.subscribeToChanges(tableName, (payload) => {
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
    const agencyId = user?.agencyId || 'demo_agency';
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await dbService.getDashboardStats(agencyId);
      setStats(result);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setStats({
        totalProperties: 0,
        totalOwners: 0,
        totalTenants: 0,
        totalContracts: 0,
        monthlyRevenue: 0,
        activeContracts: 0,
        occupancyRate: 0
      });
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

  const fetchData = async () => {
    try {
      const agencyId = user?.agencyId || 'demo_agency';
      
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction(agencyId);
      setData(result || []);
    } catch (err) {
      console.error('❌ Erreur chargement données:', err);
      
      // En cas d'erreur, continuer sans bloquer
      console.warn('⚠️ Mode démo activé suite à erreur');
      setError(null);
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
      const result = await createFunction(data);
      onSuccess?.(result);
      return result;
    } catch (err) {
      console.error('Error in create:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
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
      
      setError(null);
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
      
      setError(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteItem, loading, error };
}