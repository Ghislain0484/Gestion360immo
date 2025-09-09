import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isRlsDenied, formatSbError, dbService, supabase } from '../lib/supabase';
import { Entity } from '../types/db';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';
import equal from 'fast-deep-equal';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Logging conditionnel (DEV uniquement)
const log = (...args: any[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

// ---------------------------------------------
// Utility: map Supabase error to readable string
// ---------------------------------------------
export function mapSupabaseError(err: unknown, context: string): string {
  if (!(err instanceof Error)) return 'Erreur inconnue';
  if (isRlsDenied(err)) return 'Accès refusé : permissions insuffisantes (RLS).';
  if (err.message.includes('Supabase non configuré') || err.message.includes('401')) {
    return 'Configuration Supabase manquante. Vérifiez les variables d\'environnement.';
  }
  if (err.message.includes('JWT')) return 'Session expirée. Veuillez vous reconnecter.';
  return formatSbError(context, err);
}

// -----------------------------
// useRealtimeData
// -----------------------------
interface UseRealtimeDataOptions {
  single?: boolean;
  onError?: (err: string) => void;
}

export function useRealtimeData<T extends Entity>(
  fetchFunction: (agencyId: string) => Promise<T[]>,
  tableName: string,
  options?: UseRealtimeDataOptions
) {
  const { user } = useAuth();

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestDataRef = useRef<T[]>([]);
  const isFetchingRef = useRef(false);

  // ⚠️ agencyId peut changer souvent → on le rend stable
  const agencyId = user?.agency_id ?? null;
  const stableAgencyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (agencyId && agencyId !== stableAgencyIdRef.current) {
      stableAgencyIdRef.current = agencyId;
    }
  }, [agencyId]);

  const stableAgencyId = stableAgencyIdRef.current;
  const stableTableName = tableName;

  const fetchData = useCallback(
    async (agencyId: string, signal: AbortSignal) => {
      if (!agencyId || isFetchingRef.current) {
        log(`🚫 Ignorer fetch ${tableName} : agence invalide ou déjà en cours`);
        return;
      }

      isFetchingRef.current = true;
      try {
        setLoading(true);
        setError(null);
        log(`🔄 Chargement ${tableName} pour agence:`, agencyId);

        const result = await fetchFunction(agencyId);
        if (!signal.aborted) {
          if (!equal(latestDataRef.current, result)) {
            log(`✅ ${tableName} mis à jour:`, result.length);
            latestDataRef.current = result;
            setData(result);
          } else {
            log(`✅ ${tableName} inchangé`);
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        log(`❌ Erreur chargement ${tableName}:`, err);
        const errMsg = mapSupabaseError(err, `Erreur chargement ${tableName}`);
        setError(errMsg);
        options?.onError?.(errMsg);
        setData([]);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          isFetchingRef.current = false;
        }
      }
    },
    [fetchFunction, tableName, options]
  );

  useEffect(() => {
    if (!stableAgencyId) {
      setData([]);
      setLoading(false);
      setError('Aucune agence associée à l’utilisateur');
      return;
    }

    const abortController = new AbortController();
    fetchData(stableAgencyId, abortController.signal);
    return () => abortController.abort();
  }, [stableAgencyId, fetchFunction]);

  useEffect(() => {
    if (!stableAgencyId) {
      setData([]);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    fetchData(stableAgencyId, abortController.signal);
    return () => abortController.abort();
  }, [stableAgencyId, fetchData]);

  const debouncedRefetch = useCallback(
    debounce(() => {
      if (!stableAgencyId) return;
      fetchData(stableAgencyId, new AbortController().signal);
    }, 2000),
    [stableAgencyId, fetchData]
  );

  useEffect(() => {
    if (!stableAgencyId || !stableTableName) {
      log(`🚫 Pas de subscription pour ${tableName}: agency_id ou tableName manquant`);
      return;
    }

    log(`📡 Initialisation subscription pour ${tableName}, agency: ${stableAgencyId}`);
    const channel = supabase
      .channel(`public:${stableTableName}:${stableAgencyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: stableTableName,
          filter: `agency_id=eq.${stableAgencyId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
          log(`📡 Événement reçu pour ${tableName}:`, payload);
          const row = (payload.new || payload.old) as { agency_id?: string };
          if (
            row?.agency_id === stableAgencyId &&
            ['INSERT', 'UPDATE', 'DELETE'].includes(payload.eventType)
          ) {
            log(`✅ Changement valide dans ${tableName} (agence ${stableAgencyId})`);
            debouncedRefetch();
          } else {
            log(`🚫 Événement ignoré pour ${tableName}`);
          }
        }
      )
      .subscribe((status) => {
        log(`📡 Statut subscription ${tableName}:`, status);
      });

    return () => {
      log(`🛑 Cleanup subscription ${tableName}`);
      supabase.removeChannel(channel);
      debouncedRefetch.cancel();
    };
  }, [stableAgencyId, stableTableName, debouncedRefetch]);

  const refetch = useCallback(() => {
    debouncedRefetch();
  }, [debouncedRefetch]);

  return { data, loading, error, refetch, setData };
}

// -----------------------------
// useDashboardStats
// -----------------------------
export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    totalProperties: number;
    totalOwners: number;
    totalTenants: number;
    totalContracts: number;
    monthlyRevenue: number;
    activeContracts: number;
    occupancyRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (signal: AbortSignal) => {
    if (!user?.agency_id) {
      setStats({
        totalProperties: 0,
        totalOwners: 0,
        totalTenants: 0,
        totalContracts: 0,
        monthlyRevenue: 0,
        activeContracts: 0,
        occupancyRate: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dbService.getDashboardStats(user.agency_id);
      if (!signal.aborted) setStats(result);
    } catch (err) {
      if (signal.aborted) return;
      log('❌ Erreur stats:', err);
      const errMsg = mapSupabaseError(err, 'Erreur chargement stats');
      setError(errMsg);
      setStats({
        totalProperties: 0,
        totalOwners: 0,
        totalTenants: 0,
        totalContracts: 0,
        monthlyRevenue: 0,
        activeContracts: 0,
        occupancyRate: 0,
      });
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [user?.agency_id]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchStats(abortController.signal);
    return () => abortController.abort();
  }, [fetchStats]);

  const refetch = useCallback(() => {
    fetchStats(new AbortController().signal);
  }, [fetchStats]);

  return { stats, loading, error, refetch };
}

// -----------------------------
// useSupabaseCreate
// -----------------------------
export function useSupabaseCreate<T extends Entity>(
  createFunction: (data: Partial<T>) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (err: string) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const create = async (data: Partial<T>) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await createFunction(data);
      options?.onSuccess?.(result);
      if (options?.successMessage) toast.success(options.successMessage);
      setSuccess(true);
      return result;
    } catch (err) {
      log('❌ Erreur création:', err);
      const errMsg = mapSupabaseError(err, 'Erreur création');
      setError(errMsg);
      options?.onError?.(errMsg);
      if (options?.errorMessage) toast.error(options.errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return { create, loading, error, success, reset };
}

// -----------------------------
// useSupabaseUpdate
// -----------------------------
export function useSupabaseUpdate<T extends Entity>(
  updateFunction: (id: string, data: Partial<T>) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (err: string) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = async (id: string, data: Partial<T>) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateFunction(id, data);
      options?.onSuccess?.(result);
      if (options?.successMessage) toast.success(options.successMessage);
      setSuccess(true);
      return result;
    } catch (err) {
      log('❌ Erreur mise à jour:', err);
      const errMsg = mapSupabaseError(err, 'Erreur mise à jour');
      setError(errMsg);
      options?.onError?.(errMsg);
      if (options?.errorMessage) toast.error(options.errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return { update, loading, error, success, reset };
}

// -----------------------------
// useSupabaseDelete
// -----------------------------
export function useSupabaseDelete(
  deleteFunction: (id: string) => Promise<boolean>,
  options?: {
    onSuccess?: () => void;
    onError?: (err: string) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const deleteItem = async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await deleteFunction(id);
      setSuccess(true);
      options?.onSuccess?.();
      if (options?.successMessage) toast.success(options.successMessage);
    } catch (err) {
      log('❌ Erreur suppression:', err);
      const errMsg = mapSupabaseError(err, 'Erreur suppression');
      setError(errMsg);
      options?.onError?.(errMsg);
      if (options?.errorMessage) toast.error(options.errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return { deleteItem, loading, error, success, reset };
}