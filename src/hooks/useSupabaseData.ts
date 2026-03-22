import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../lib/supabase';
import { AgencyEntity, Entity } from '../types/db';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';
import { formatSbError, isRlsDenied } from '../lib/helpers';
import { supabase } from '../lib/config';
import { useDemoMode } from '../contexts/DemoContext';
import { MOCK_STATS } from '../lib/mockData';

// Logging conditionnel (DEV uniquement)
const log = (...args: any[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

// ---------------------------------------------
// Utility: map Supabase error to readable string
// ---------------------------------------------
export function mapSupabaseError(err: unknown, context: string): string {
  if (!(err instanceof Error)) return 'Erreur inconnue';
  if (isRlsDenied(err)) return 'Acces refuse : permissions insuffisantes (RLS).';
  if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('fetch')) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion Internet ou si le projet Supabase est actif (non mis en pause).';
  }
  if (err.message.includes('Supabase non configure') || err.message.includes('401')) {
    return 'Configuration Supabase manquante. Verifiez les variables d\'environnement.';
  }
  if (err.message.includes('JWT')) return 'Session expiree. Veuillez vous reconnecter.';
  return formatSbError(context, err);
}

/**
 * Parametres generiques pour toutes les requetes `getAll` de dbService.
 * Sert   filtrer, paginer, chercher, et eventuellement trier les donnees.
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

  /** Fourre-tout extensible (evite les erreurs TS   chaque nouveau filtre) */
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
  const { isDemoMode } = useDemoMode();
  const [data, setData] = useState<T[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Stabiliser agencyId et params
  const agencyId = useMemo(() => (authLoading ? null : user?.agency_id ?? null), [user?.agency_id, authLoading]);
  const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params]);
  const fetchParams = useMemo(() => {
    const baseParams = paramsKey ? (JSON.parse(paramsKey) as GetAllParams) : {};
    return { ...baseParams, agency_id: agencyId ?? baseParams.agency_id ?? undefined };
  }, [paramsKey, agencyId]);

  // -------------------------
  // Fonction de fetch
  // -------------------------
  const fetchData = useCallback(async (params: GetAllParams) => {
    if (!isMountedRef.current) return;

    if (!params.agency_id) {
      const msg = 'Aucune agence associee a l\'utilisateur';
      setError(msg);
      setInitialLoading(false);
      setFetching(false);
      setData([]);
      log(`⚠️ Ignorer fetch ${tableName}: agency_id manquant`);
      return;
    }

    if (isDemoMode) {
      log(`🛠️ Mode Démo : Injection de mock data filtrée pour table ${tableName}`, params);
      const { 
        MOCK_PROPERTIES, 
        MOCK_OWNERS, 
        MOCK_TENANTS, 
        MOCK_CONTRACTS, 
        MOCK_RECEIPTS, 
        MOCK_TRANSACTIONS,
        MOCK_MANAGED_CONTRACTS 
      } = await import('../lib/mockData');
      
      const mockMap: Record<string, any[]> = {
        'properties': MOCK_PROPERTIES,
        'owners': MOCK_OWNERS || [],
        'tenants': MOCK_TENANTS || [],
        'contracts': MOCK_CONTRACTS || [],
        'managed_contracts': MOCK_MANAGED_CONTRACTS || [],
        'rent_receipts': MOCK_RECEIPTS || [],
        'modular_transactions': MOCK_TRANSACTIONS || [],
        'transactions': MOCK_TRANSACTIONS || []
      };
      
      let mockResult = [...(mockMap[tableName] || [])];

      // --- FILTRAGE AVANCÉ DES MOCK DATA ---

      // 1. Filtrage par ID unique (ex: findOne/getById)
      if (params.id) {
        mockResult = mockResult.filter(item => item.id === params.id);
      }

      // 2. Filtrage par owner_id
      if (params.owner_id) {
        mockResult = mockResult.filter(item => item.owner_id === params.owner_id);
      }

      // 3. Filtrage par property_id
      if (params.property_id) {
        mockResult = mockResult.filter(item => item.property_id === params.property_id);
      }

      // 4. Filtrage par tenant_id
      if (params.tenant_id) {
        mockResult = mockResult.filter(item => item.tenant_id === params.tenant_id);
      }

      // 5. Filtrage par contract_id
      if (params.contract_id) {
        mockResult = mockResult.filter(item => item.contract_id === params.contract_id);
      }

      // 6. Filtrage par search
      if (params.search) {
        const s = params.search.toLowerCase();
        mockResult = mockResult.filter(item => 
          (item.first_name && item.first_name.toLowerCase().includes(s)) ||
          (item.last_name && item.last_name.toLowerCase().includes(s)) ||
          (item.title && item.title.toLowerCase().includes(s)) ||
          (item.name && item.name.toLowerCase().includes(s))
        );
      }

      // 3. Simuler les JOINS (très basique pour les besoins de la démo)
      if (tableName === 'properties') {
        mockResult = mockResult.map(prop => {
          const property_contracts = MOCK_CONTRACTS.filter(c => c.property_id === prop.id).map(c => ({
            ...c,
            tenant: MOCK_TENANTS.find(t => t.id === c.tenant_id),
            owner: MOCK_OWNERS.find(o => o.id === c.owner_id)
          }));
          const owner = MOCK_OWNERS.find(o => o.id === prop.owner_id);
          return { ...prop, contracts: property_contracts, owner };
        });
      }

      if (tableName === 'contracts') {
        mockResult = mockResult.map(c => ({
          ...c,
          tenant: MOCK_TENANTS.find(t => t.id === c.tenant_id),
          property: MOCK_PROPERTIES.find(p => p.id === c.property_id),
          owner: MOCK_OWNERS.find(o => o.id === c.owner_id)
        }));
      }

      if (tableName === 'owners' && params.includeStats) {
        // Optionnel: calcul de stats à la volée
      }
      
      setData(mockResult as T[]);
      setInitialLoading(false);
      setFetching(false);
      return;
    }

    if (isFetchingRef.current) {
      log(`⚠️ Ignorer fetch ${tableName}: deja en cours`);
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
      log(`[info] ${tableName} mis à jour: ${result.length} items`);
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = mapSupabaseError(err, `Erreur chargement ${tableName}`);
      setError(msg);
      options?.onError?.(msg);
      toast.error(msg);
      setData([]);
      log(`[error] Erreur fetch ${tableName}:`, err);
    } finally {
      if (!isMountedRef.current) return;
      isFetchingRef.current = false;
      setInitialLoading(false);
      setFetching(false);
      log(`[info] Fetch ${tableName} termine`);
    }
  }, [fetchFunction, tableName, options, isDemoMode]); // Added isDemoMode to deps

  // ---------------------------------------
  // Inteception pour le mode démo (Sync simple)
  // ---------------------------------------
  useEffect(() => {
    if (isDemoMode) {
      fetchData(fetchParams);
    }
  }, [isDemoMode, tableName, fetchParams, fetchData]);

  // ---------------------------------------
  // Gestion des abonnements en temps reel
  // ---------------------------------------
  const debouncedRefetch = useCallback(
    debounce((params: GetAllParams) => {
      if (!isMountedRef.current) return;
      log(`🔄 Refetch ${tableName} declenche`);
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
      const msg = 'Aucune agence associee a l\'utilisateur';
      setError(msg);
      setInitialLoading(false);
      setData([]);
      // Pas de toast : l'alerte rouge dans le Dashboard est suffisante
      return;
    }

    if (isDemoMode) {
      log(`🛠️ Mode Démo : Bypass total DB pour ${tableName}`);
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
              log(`📡 Event recu pour ${tableName} valide (agence ${agencyId})`);
              debouncedRefetch(fetchParams);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') log(`[info] Subscription active pour ${tableName}`);
        });

      channelRef.current = channel;
    }

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        log(`🔌 Cleanup subscription ${tableName}`);
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
import { DashboardStats } from '../types/platform';

// ... (vers ligne 237)
export function useDashboardStats() {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
        expectedRevenue: 0,
        remainingRevenue: 0,
        activeContracts: 0,
        occupancyRate: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isDemoMode) {
        log('🛠️ Mode Démo actif pour Stats, injection des données fictives');
        setTimeout(() => {
          if (!signal.aborted) {
            setStats(MOCK_STATS);
            setLoading(false);
          }
        }, 300);
        return;
      }

      const result = await dbService.getDashboardStats(user.agency_id);
      if (!signal.aborted) setStats(result);
    } catch (err) {
      if (signal.aborted) return;
      log('[error] Erreur stats:', err);
      const errMsg = mapSupabaseError(err, 'Erreur chargement stats');
      setError(errMsg);
      toast.error(errMsg);
      setStats({
        totalProperties: 0,
        totalOwners: 0,
        totalTenants: 0,
        totalContracts: 0,
        monthlyRevenue: 0,
        expectedRevenue: 0,
        remainingRevenue: 0,
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
    if (loading) return;
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
      log('[error] Erreur creation:', err);
      const errMsg = mapSupabaseError(err, 'Erreur creation');
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
    if (loading) return;
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
      log('[error] Erreur mise   jour:', err);
      const errMsg = mapSupabaseError(err, 'Erreur mise   jour');
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
      log('[error] Erreur suppression:', err);
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
      console.error('Erreur lors de la verification des permissions:', err);
      return { canEdit: false, canDelete: false, canContact: true };
    }
  };

  return { checkPermission, permissions };
};



