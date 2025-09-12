import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../lib/supabase';
import { Entity } from '../types/db';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';
import equal from 'fast-deep-equal';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { formatSbError, isRlsDenied } from '../lib/helpers';
import { supabase } from '../lib/config';

// Logging conditionnel (DEV uniquement)
const log = (...args: any[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

// Stable stringify pour éviter changements de référence
const stableStringify = (obj: any) => JSON.stringify(obj, (key, value) => (value instanceof Date ? value.toISOString() : value));


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

// -----------------------------
// useRealtimeData
// -----------------------------

interface UseRealtimeDataOptions {
  single?: boolean;
  onError?: (err: string) => void;
}

export interface UseRealtimeDataResult<T extends Entity> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useRealtimeData<T extends Entity>(
  fetchFunction: (params?: GetAllParams) => Promise<T[]>,
  tableName: string,
  params?: GetAllParams,
  options?: UseRealtimeDataOptions
): UseRealtimeDataResult<T> {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestDataRef = useRef<T[]>([]);
  const isFetchingRef = useRef(false);
  const channelRef = useRef<any>(null);
  const subscriptionStatusRef = useRef<string>('INITIAL');
  const isMountedRef = useRef(true);
  const lastDepsRef = useRef({ agencyId: null as string | null, authLoading: null as boolean | null, params: null as GetAllParams | null });

  // Stabiliser agencyId et params
  const agencyId = useMemo(() => (authLoading ? null : user?.agency_id ?? null), [user?.agency_id, authLoading]);
  const fetchParams = useMemo(() => ({ ...params, agency_id: agencyId ?? params?.agency_id }), [params, agencyId]);

  // Vérifier si les dépendances ont changé
  const depsChanged = !equal(
    { agencyId, authLoading, params: fetchParams },
    { agencyId: lastDepsRef.current.agencyId, authLoading: lastDepsRef.current.authLoading, params: lastDepsRef.current.params }
  );

  // Fonction de fetch
  const fetchData = useCallback(
    async (params: GetAllParams, signal: AbortSignal) => {
      if (!isMountedRef.current) {
        log(`🚫 Ignorer fetch ${tableName} : composant démonté`);
        return;
      }
      if (!params.agency_id) {
        log(`🚫 Ignorer fetch ${tableName} : agency_id manquant`);
        setError('Aucune agence associée à l’utilisateur');
        setLoading(false);
        toast.error('Aucune agence associée à l’utilisateur');
        return;
      }
      if (isFetchingRef.current) {
        log(`🚫 Ignorer fetch ${tableName} : déjà en cours`);
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      log(`🔄 Chargement ${tableName} pour agence:`, params.agency_id);

      try {
        const result = await fetchFunction(params);
        if (!signal.aborted && isMountedRef.current) {
          if (!equal(latestDataRef.current, result)) {
            log(`✅ ${tableName} mis à jour:`, result.length);
            latestDataRef.current = result;
            setData(result);
          } else {
            log(`✅ ${tableName} inchangé`);
          }
        }
      } catch (err) {
        if (signal.aborted || !isMountedRef.current) {
          log(`🚫 Fetch ${tableName} annulé ou composant démonté`);
          return;
        }
        log(`❌ Erreur chargement ${tableName}:`, err);
        const errMsg = mapSupabaseError(err, `Erreur chargement ${tableName}`);
        setError(errMsg);
        options?.onError?.(errMsg);
        toast.error(errMsg);
        setData([]);
      } finally {
        if (!signal.aborted && isMountedRef.current) {
          isFetchingRef.current = false;
          setLoading(false);
          log(`✅ Fetch ${tableName} terminé`);
        }
      }
    },
    [fetchFunction, tableName, options]
  );

  // Gestion des abonnements en temps réel
  const debouncedRefetch = useCallback(
    debounce((params: GetAllParams) => {
      if (!isMountedRef.current) {
        log(`🚫 Ignorer refetch ${tableName} : composant démonté`);
        return;
      }
      log(`🔄 Refetch déclenché pour ${tableName}`);
      fetchData(params, new AbortController().signal);
    }, 1000),
    [fetchData, tableName]
  );

  useEffect(() => {
    log(`🔄 useEffect exécuté pour ${tableName}, agencyId: ${agencyId}, authLoading: ${authLoading}, params:`, fetchParams);
    console.log('🔄 Dépendances useRealtimeData:', { agencyId, authLoading, tableName, params: fetchParams });

    if (!depsChanged) {
      log(`🚫 useEffect ignoré pour ${tableName} : dépendances inchangées`);
      return;
    }

    lastDepsRef.current = { agencyId, authLoading, params: fetchParams };
    isMountedRef.current = true;

    if (authLoading) {
      log(`⏳ Authentification en cours, attente pour ${tableName}`);
      setLoading(true);
      return;
    }

    if (!agencyId) {
      log(`🚫 Pas d'agence pour ${tableName}`);
      setLoading(false);
      setError('Aucune agence associée à l’utilisateur');
      toast.error('Aucune agence associée à l’utilisateur');
      setData([]);
      return;
    }

    log(`🔍 Initialisation fetch pour ${tableName} avec params:`, fetchParams);
    const abortController = new AbortController();
    fetchData(fetchParams, abortController.signal);

    // Vérifier si un canal actif existe
    if (channelRef.current && subscriptionStatusRef.current === 'SUBSCRIBED') {
      log(`🚫 Canal actif pour ${tableName}, ignorer réinitialisation`);
      return;
    }

    log(`📡 Initialisation subscription pour ${tableName}, agency: ${agencyId}`);
    const channel = supabase
      .channel(`public:${tableName}:${agencyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
          log(`📡 Événement reçu pour ${tableName}:`, payload);
          const row = (payload.new || payload.old) as { agency_id?: string };
          if (
            row?.agency_id === agencyId &&
            ['INSERT', 'UPDATE', 'DELETE'].includes(payload.eventType)
          ) {
            log(`✅ Changement valide dans ${tableName} (agence ${agencyId})`);
            debouncedRefetch(fetchParams);
          } else {
            log(`🚫 Événement ignoré pour ${tableName}`);
          }
        }
      )
      .subscribe((status) => {
        log(`📡 Statut subscription ${tableName}:`, status);
        subscriptionStatusRef.current = status;
      });

    channelRef.current = channel;

    return () => {
      log(`🛑 Cleanup pour ${tableName}`);
      isMountedRef.current = false;
      abortController.abort();
      if (channelRef.current) {
        log(`🛑 Suppression subscription ${tableName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        subscriptionStatusRef.current = 'CLOSED';
      }
    };
  }, [agencyId, authLoading, tableName, stableStringify(fetchParams)]);

  const refetch = useCallback(() => {
    if (agencyId && isMountedRef.current) {
      debouncedRefetch(fetchParams);
    }
  }, [agencyId, debouncedRefetch, fetchParams]);

  return { data, loading, error, refetch, setData };
}

// -----------------------------
// useDashboardStats
// -----------------------------
export function useDashboardStats() {
  const { user, isLoading: authLoading } = useAuth();
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
