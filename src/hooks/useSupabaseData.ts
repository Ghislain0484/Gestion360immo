import { useEffect, useMemo, useState } from 'react';
import { dbService } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// --- UUID guard helper (production-safe) ---
const isUuid = (v?: string | null): boolean =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

type DashboardData = {
  totalProperties: number;
  totalOwners: number;
  totalTenants: number;
  totalContracts: number;
  activeContracts: number;
  monthlyRevenue: number;
  occupancyRate: number;
};

type UseRealtimeResult<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * Hook unifié: charge les 4 entités + calcule un dashboard simple.
 * - Ne fait rien tant que l'agence n'est pas un UUID valide (évite 22P02)
 * - Peut être appelé sans argument: user lu depuis AuthContext
 */
export function useSupabaseData(overrideUser?: { agencyId?: string | null }) {
  const { user: ctxUser } = useAuth();
  const user = overrideUser ?? ctxUser;

  const [owners, setOwners] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setOwners([]); setProperties([]); setTenants([]); setContracts([]);
    setError(null);
  };

  const fetchAll = async () => {
    const agencyId = user?.agencyId ?? null;

    if (!isUuid(agencyId)) {
      console.warn('⏭️ agencyId invalide/absent — skip requêtes Supabase');
      reset();
      return;
    }

    setLoading(true); setError(null);
    try {
      const [o, p, t, c] = await Promise.all([
        dbService.getOwners(agencyId),
        dbService.getProperties(agencyId),
        dbService.getTenants(agencyId),
        dbService.getContracts(agencyId),
      ]);
      setOwners(o ?? []);
      setProperties(p ?? []);
      setTenants(t ?? []);
      setContracts(c ?? []);
    } catch (e: any) {
      console.error('❌ useSupabaseData error:', e);
      setError(e?.message || 'Erreur inconnue');
      reset();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.agencyId]);

  const stats: DashboardData = useMemo(() => {
    const totalProps = properties.length;
    const totalOwners = owners.length;
    const totalTenants = tenants.length;
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter((c: any) => c.status === 'active').length;
    const monthlyRevenue = contracts.reduce((sum: number, c: any) => sum + (c?.monthly_rent || 0), 0);
    const occupancyRate = totalProps ? Math.round((properties.filter((p: any) => p.status === 'occupied').length / totalProps) * 100) : 0;

    return {
      totalProperties: totalProps,
      totalOwners,
      totalTenants,
      totalContracts,
      activeContracts,
      monthlyRevenue,
      occupancyRate,
    };
  }, [owners, properties, tenants, contracts]);

  return {
    owners, properties, tenants, contracts,
    stats,
    loading, error,
    reload: fetchAll,
  };
}

/**
 * ✅ Compat: même signature que l'ancien hook
 *   useRealtimeData(fetcher, 'contracts') -> { data, loading, error, reload }
 *   fetcher est typiquement dbService.getContracts (agencyId) => Promise<any[]>
 */
export function useRealtimeData<T = any>(
  fetcher: (agencyId?: string) => Promise<T[]>,
  _key: 'owners' | 'properties' | 'tenants' | 'contracts'
): UseRealtimeResult<T> {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const agencyId = user?.agencyId ?? null;
    if (!isUuid(agencyId)) {
      console.warn('⏭️ useRealtimeData: agencyId invalide/absent — skip');
      setData([]);
      return;
    }
    setLoading(true); setError(null);
    try {
      const rows = await fetcher(agencyId);
      setData(rows ?? []);
    } catch (e: any) {
      console.error('❌ useRealtimeData error:', e);
      setError(e?.message || 'Erreur inconnue');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.agencyId, fetcher]);
  return { data, loading, error, reload: load };
}

/**
 * ✅ Compat: renvoie { stats, loading, error, reload }
 *   pour correspondre à l'ancien Dashboard.
 */
export function useDashboardStats() {
  const { user } = useAuth();
  const { stats, loading, error, reload } = useSupabaseData(user);
  return { stats, loading, error, reload };
}

/* --- Compatibilité: hooks CRUD génériques utilisés par des listes --- */
export function useSupabaseCreate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (
    table: 'owners' | 'properties' | 'tenants' | 'contracts',
    payload: any
  ) => {
    setLoading(true); setError(null);
    try {
      switch (table) {
        case 'owners': return await dbService.createOwner(payload);
        case 'properties': return await dbService.createProperty(payload);
        case 'tenants': return await dbService.createTenant(payload);
        case 'contracts': return await dbService.createContract(payload);
        default: throw new Error(`Unsupported table for create: ${table}`);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur création');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}

export function useSupabaseDelete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (
    table: 'owners' | 'properties' | 'tenants' | 'contracts',
    id: string
  ) => {
    setLoading(true); setError(null);
    try {
      switch (table) {
        case 'owners': return await dbService.deleteOwner(id);
        case 'properties': return await dbService.deleteProperty(id);
        case 'tenants': return await dbService.deleteTenant(id);
        case 'contracts': return await dbService.deleteContract(id);
        default: throw new Error(`Unsupported table for delete: ${table}`);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur suppression');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // alias pour compat avec certains composants
  const del = remove;
  return { remove, del, loading, error };
}
