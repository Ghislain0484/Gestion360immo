import { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Hook robuste pour le chargement des données avec gestion d'erreurs
export function useRealtimeData<T>(
  fetchFunction: (agencyId: string) => Promise<T[]>,
  tableName: string
) {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.agencyId) {
      console.log(`⚠️ Pas d'agencyId pour ${tableName}`);
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Chargement ${tableName} pour agence:`, user.agencyId);
      
      const result = await fetchFunction(user.agencyId);
      console.log(`✅ ${tableName} chargés:`, result?.length || 0);
      setData(result || []);
      
    } catch (err) {
      console.error(`❌ Erreur chargement ${tableName}:`, err);
      
      // Messages d'erreur spécifiques
      if (err instanceof Error) {
        if (err.message.includes('Supabase non configuré') || err.message.includes('401')) {
          setError('Configuration Supabase manquante. Vérifiez les variables d\'environnement.');
        } else if (err.message.includes('JWT')) {
          setError('Session expirée. Reconnectez-vous.');
        } else if (err.message.includes('PGRST301')) {
          setError('Erreur d\'authentification Supabase. Utilisation des données locales.');
        } else {
          setError(`Erreur: ${err.message}`);
        }
      } else {
        setError(`Erreur de chargement des ${tableName}`);
      }
      
      // En cas d'erreur, essayer de charger les données locales
      try {
        const localKey = user?.agencyId ? `demo_${tableName}_${user.agencyId}` : `demo_${tableName}`;
        const localData = JSON.parse(localStorage.getItem(localKey) || '[]');
        console.log(`🔄 Fallback ${tableName} depuis localStorage:`, localData.length);
        setData(localData);
        setError(null); // Effacer l'erreur si on a des données locales
      } catch (localError) {
        console.error(`❌ Erreur données locales ${tableName}:`, localError);
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(`🔄 useRealtimeData effect pour ${tableName}, agencyId:`, user?.agencyId);
    fetchData();
  }, [user?.agencyId, tableName]);

  const refetch = () => {
    fetchData();
  };

  return { data, loading, error, refetch, setData };
}

// Hook pour les stats du dashboard
export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.agencyId) {
        setStats({
          totalProperties: 0,
          totalOwners: 0,
          totalTenants: 0,
          totalContracts: 0,
          monthlyRevenue: 0,
          activeContracts: 0,
          occupancyRate: 0
        });
        setLoading(false);
        return;
      }

      try {
        const result = await dbService.getDashboardStats(user.agencyId);
        setStats(result);
      } catch (error) {
        console.error('Erreur stats:', error);
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

    fetchStats();
  }, [user?.agencyId]);

  return { stats, loading };
}

// Hook pour création
export function useSupabaseCreate<T>(
  createFunction: (data: any) => Promise<T>,
  onSuccess?: (data: T) => void
) {
  const [loading, setLoading] = useState(false);

  const create = async (data: any) => {
    setLoading(true);
    try {
      const result = await createFunction(data);
      onSuccess?.(result);
      return result;
    } catch (err) {
      console.error('Erreur création:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
}

// Hook pour suppression
export function useSupabaseDelete(
  deleteFunction: (id: string) => Promise<any>,
  onSuccess?: () => void
) {
  const [loading, setLoading] = useState(false);

  const deleteItem = async (id: string) => {
    setLoading(true);
    try {
      await deleteFunction(id);
      onSuccess?.();
    } catch (err) {
      console.error('Erreur suppression:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteItem, loading };
}