import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../lib/supabase';
import { AgencyEntity, Entity } from '../types/db';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';
import { formatSbError, isRlsDenied } from '../lib/helpers';
import { supabase } from '../lib/config';

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

/**
 * Paramètres génériques pour toutes les requêtes `getAll` de dbService.
 * Sert à filtrer, paginer, chercher, et éventuellement trier les données.
 */
export interface GetAllParams {
  /** Contexte multi-agences */
  agency_id?: string;

  /** Filtres relationnels */
  owner_id?: string;
  tenant_id?: string;
  property_id?: string;
  contract_id?: string;

  /** Filtres de statut */
  standing?: string;        // pour les biens
  status?: string;          // pour contrats, paiements, etc.

  /** Recherche textuelle globale */
  search?: string;

  /** Pagination */
  limit?: number;
  offset?: number;

  /** Tri */
  order_by?: string;
  order_dir?: 'asc' | 'desc';

  /** Fourre-tout extensible (évite les erreurs TS à chaque nouveau filtre) */
  [key: string]: any;
}

const DEFAULT_PARAMS: GetAllParams = {};

// -----------------------------
// useRealtimeData
// -----------------------------

interface UseRealtimeDataOptions {
  single?: boolean;
  onError?: (err: string) => void;
}

export interface UseRealtimeDataResult<T extends AgencyEntity> {
  data: T[];
  initialLoading: boolean;
  fetching: boolean;
  error: string | null;
  refetch: () => void;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useRealtimeData<T extends AgencyEntity>(
  fetchFunction: (params?: GetAllParams) => Promise<T[]>,
  tableName: string,
  params: GetAllParams = DEFAULT_PARAMS,
  options?: UseRealtimeDataOptions
): UseRealtimeDataResult<T> {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Stabiliser agencyId et params
  const agencyId = useMemo(() => (authLoading ? null : user?.agency_id ?? null), [user?.agency_id, authLoading]);
  const fetchParams = useMemo(() => ({ ...params, agency_id: agencyId ?? params.agency_id ?? undefined }), [params, agencyId]);

  // -------------------------
  // Fonction de fetch
  // -------------------------
  const fetchData = useCallback(async (params: GetAllParams) => {
    if (!isMountedRef.current) return;

    if (!params.agency_id) {
      const msg = 'Aucune agence associée à l’utilisateur';
      setError(msg);
      setInitialLoading(false);
      setFetching(false);
      setData([]);
      toast.error(msg);
      log(`🚫 Ignorer fetch ${tableName}: agency_id manquant`);
      return;
    }

    if (isFetchingRef.current) {
      log(`🚫 Ignorer fetch ${tableName}: déjà en cours`);
      return;
    }

    isFetchingRef.current = true;
    setFetching(true);
    setError(null);
    log(`🔍 Fetch ${tableName} avec params:`, params);

    try {
      const result = await fetchFunction(params);
      if (!isMountedRef.current) return;
      setData(result);
      log(`✅ ${tableName} mis à jour: ${result.length} items`);
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = mapSupabaseError(err, `Erreur chargement ${tableName}`);
      setError(msg);
      options?.onError?.(msg);
      toast.error(msg);
      setData([]);
      log(`❌ Erreur fetch ${tableName}:`, err);
    } finally {
      if (!isMountedRef.current) return;
      isFetchingRef.current = false;
      setInitialLoading(false);
      setFetching(false);
      log(`✅ Fetch ${tableName} terminé`);
    }
  }, [fetchFunction, tableName, options]);

  // ---------------------------------------
  // Gestion des abonnements en temps réel
  // ---------------------------------------
  const debouncedRefetch = useCallback(
    debounce((params: GetAllParams) => {
      if (!isMountedRef.current) return;
      log(`🔄 Refetch ${tableName} déclenché`);
      fetchData(params);
    }, 500),
    [fetchData, tableName]
  );

  // -------------------------
  // useEffect principal
  // -------------------------
  useEffect(() => {
    isMountedRef.current = true;

    if (authLoading) {
      setInitialLoading(true);
      return;
    }

    if (!agencyId) {
      const msg = 'Aucune agence associée à l’utilisateur';
      setError(msg);
      setInitialLoading(false);
      setData([]);
      toast.error(msg);
      return;
    }

    fetchData(fetchParams);

    if (!channelRef.current) {
      log(`📡 Subscription ${tableName}, agency: ${agencyId}`);
      const channel = supabase
        .channel(`public:${tableName}:${agencyId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName, filter: `agency_id=eq.${agencyId}` },
          (payload: RealtimePostgresChangesPayload<T>) => {
            const row = (payload.new ?? payload.old) as T;
            if (!agencyId || row?.agency_id === agencyId) {
              log(`📡 Event reçu pour ${tableName} valide (agence ${agencyId})`);
              debouncedRefetch(fetchParams);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') log(`✅ Subscription active pour ${tableName}`);
        });

      channelRef.current = channel;
    }

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        log(`🛑 Cleanup subscription ${tableName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchData, tableName, agencyId, fetchParams, authLoading, debouncedRefetch]);

  // -------------------------
  // Refetch manuel
  // -------------------------
  const refetch = useCallback(() => {
    if (agencyId && isMountedRef.current) debouncedRefetch(fetchParams);
  }, [agencyId, debouncedRefetch, fetchParams]);

  return { data, initialLoading, fetching, error, refetch, setData };
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
      toast.error(errMsg);
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

// hooks/usePermissions

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<{
    canEdit: boolean;
    canDelete: boolean;
    canContact: boolean;
  }>({ canEdit: false, canDelete: false, canContact: true });

  const checkPermission = async (agencyId: string) => {
    if (!user?.id) return { canEdit: false, canDelete: false, canContact: false };

    try {
      const { data } = await supabase
        .from('agency_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('agency_id', agencyId)
        .single();

      if (!data) return { canEdit: false, canDelete: false, canContact: true };

      const role = data.role;
      const isDirectorOrAdmin = role === 'director' || role === 'admin';
      setPermissions({
        canEdit: isDirectorOrAdmin,
        canDelete: isDirectorOrAdmin,
        canContact: true, // Tous les utilisateurs peuvent contacter
      });
    } catch (err) {
      console.error('Erreur lors de la vérification des permissions:', err);
      return { canEdit: false, canDelete: false, canContact: true };
    }
  };

  return { checkPermission, permissions };
};
