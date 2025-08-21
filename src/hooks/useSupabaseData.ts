import { useEffect, useMemo, useState } from 'react';
import { dbService } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

export function useSupabaseData() {
  useAuth();
  const [owners, setOwners] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true); setError(null);
    try {
      const [o, p, t, c] = await Promise.all([
        dbService.getOwners(),
        dbService.getProperties(),
        dbService.getTenants(),
        dbService.getContracts(),
      ]);
      setOwners(o ?? []);
      setProperties(p ?? []);
      setTenants(t ?? []);
      setContracts(c ?? []);
    } catch (e: any) {
      console.error('❌ useSupabaseData error (RAW):', e);
      setError(e?.message || String(e) || 'Erreur inconnue');
      setOwners([]); setProperties([]); setTenants([]); setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

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

  return { owners, properties, tenants, contracts, stats, loading, error, reload: fetchAll };
}

export function useRealtimeData<T = any>(
  _fetcher: (agencyId?: string) => Promise<T[]>,
  key: 'owners' | 'properties' | 'tenants' | 'contracts'
): UseRealtimeResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      let rows: any[] = [];
      if (key === 'owners') rows = await dbService.getOwners();
      else if (key === 'properties') rows = await dbService.getProperties();
      else if (key === 'tenants') rows = await dbService.getTenants();
      else rows = await dbService.getContracts();
      setData((rows ?? []) as T[]);
    } catch (e: any) {
      console.error('❌ useRealtimeData error (RAW):', e);
      setError(e?.message || String(e) || 'Erreur inconnue');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [key]);
  return { data, loading, error, reload: load };
}

type TableKey = 'owners' | 'properties' | 'tenants' | 'contracts';
type CreatorFn = (payload: any) => Promise<any>;

/** Heuristique pour accepter l'ancien appel: create(payload) */
function inferTableFromContext(obj: any): TableKey {
  try {
    const path = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
    if (path.includes('/owners')) return 'owners';
    if (path.includes('/tenants')) return 'tenants';
    if (path.includes('/properties')) return 'properties';
    if (path.includes('/contracts')) return 'contracts';

    // fallback par structure
    if ('propertyTitle' in obj || 'title' in obj) return 'properties';
    if ('tenant_id' in obj || 'tenantId' in obj || 'owner_id' in obj || 'ownerId' in obj) return 'contracts';
    if ('firstName' in obj || 'first_name' in obj) return 'owners'; // défaut
  } catch {}
  return 'owners';
}

export function useSupabaseCreate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (tableOrFn: TableKey | CreatorFn | any, payload?: any) => {
    setLoading(true); setError(null);
    try {
      // Compat: si 1er arg est l'objet et aucun payload => on infère la table depuis l'URL
      if (typeof tableOrFn === 'object' && tableOrFn !== null && payload === undefined) {
        const inferred = inferTableFromContext(tableOrFn);
        console.log('🧭 create() inference →', inferred);
        payload = tableOrFn;
        tableOrFn = inferred;
      }

      const isFn = typeof tableOrFn === 'function';
      let created: any;

      if (isFn) {
        console.log('🧪 create() via custom fn, payload:', payload);
        created = await (tableOrFn as CreatorFn)(payload);
      } else {
        console.log('🧪 create() table:', tableOrFn, 'payload:', payload);
        switch (tableOrFn as TableKey) {
          case 'owners': created = await dbService.createOwner(payload); break;
          case 'properties': created = await dbService.createProperty(payload); break;
          case 'tenants': created = await dbService.createTenant(payload); break;
          case 'contracts': created = await dbService.createContract(payload); break;
          default: throw new Error(`Unsupported table for create: ${String(tableOrFn)}`);
        }
      }
      return created;
    } catch (e: any) {
      const msg = e?.message || String(e) || 'Erreur création';
      console.error('❌ useSupabaseCreate (RAW):', e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}

export function useSupabaseDelete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (table: TableKey, id: string) => {
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
      const msg = e?.message || String(e) || 'Erreur suppression';
      console.error('❌ useSupabaseDelete (RAW):', e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const del = remove;
  return { remove, del, loading, error };
}

export function useDashboardStats() {
  const { stats, loading, error, reload } = useSupabaseData();
  return { stats, loading, error, reload };
}
