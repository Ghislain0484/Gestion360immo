// src/hooks/useSupabaseData.ts
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook générique list + temps réel
 * - agencyScoped: true -> filtre agency_id = user.agencyId (pour les users d'agence)
 * - admin plateforme: pas de filtre par défaut (agencyScoped ignoré)
 * Retourne aussi refetch()
 */

type FetchOptions = {
  table: 'owners' | 'tenants' | 'properties' | 'contracts';
  agencyScoped?: boolean; // default true
  orderBy?: { column: string; ascending?: boolean };
};

export function useSupabaseData<T = any>({ table, agencyScoped = true, orderBy }: FetchOptions) {
  const { user, admin } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<ReturnType<typeof supabase['channel']> | null>(null);

  const isConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  const agencyId = useMemo(() => {
    if (admin) return null;            // admin plateforme -> pas de filtre
    return user?.agencyId ?? null;     // users d'agence -> filtre par agency_id
  }, [admin, user?.agencyId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isConfigured || !supabase) throw new Error('Supabase non configuré');
      let query = supabase.from(table).select('*');
      if (!admin && agencyScoped && agencyId) query = query.eq('agency_id', agencyId);
      if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      const { data: rows, error: qErr } = await query;
      if (qErr) throw qErr;
      setData((rows ?? []) as T[]);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [admin, agencyScoped, agencyId, isConfigured, orderBy?.ascending, orderBy?.column, table]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchData();
    })();

    // realtime
    try {
      if (subRef.current) {
        supabase.removeChannel(subRef.current);
        subRef.current = null;
      }
      const channel = supabase
        .channel(`${table}_changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          fetchData();
        })
        .subscribe();
      subRef.current = channel;
    } catch {}

    return () => {
      cancelled = true;
      try {
        if (subRef.current) supabase.removeChannel(subRef.current);
      } catch {}
    };
  }, [fetchData, table]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook léger pour écouter du temps réel sur une table donnée, sans fetch initial.
 * Utile si tu fais ton propre SELECT ailleurs mais veux re-render sur changements.
 */
export function useRealtimeData(table: FetchOptions['table'], onChange?: () => void) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    try {
      const channel = supabase
        .channel(`${table}_rt`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          onChange?.();
        })
        .subscribe(() => setOk(true));
      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      setOk(false);
    }
  }, [table, onChange]);
  return { subscribed: ok };
}

/**
 * useDashboardStats :
 * - Agrège des compteurs (owners, tenants, properties, contracts)
 * - admin plateforme: pas de filtre
 * - user d'agence: filtre par agency_id
 */
type DashboardStats = {
  owners: number;
  tenants: number;
  properties: number;
  contracts: number;
};

export function useDashboardStats() {
  const { user, admin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ owners: 0, tenants: 0, properties: 0, contracts: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agencyId = admin ? null : user?.agencyId ?? null;

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tables: FetchOptions['table'][] = ['owners', 'tenants', 'properties', 'contracts'];
      const results = await Promise.all(
        tables.map(async (t) => {
          let q = supabase.from(t).select('*', { count: 'exact', head: true });
          if (agencyId) q = q.eq('agency_id', agencyId);
          const { count, error } = await q;
          if (error) throw error;
          return count ?? 0;
        })
      );
      setStats({
        owners: results[0],
        tenants: results[1],
        properties: results[2],
        contracts: results[3],
      });
    } catch (e: any) {
      setError(e?.message ?? 'Erreur chargement statistiques');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchCounts();
    // réécoute en temps réel: si une table change, on recalcule
    const channels = ['owners', 'tenants', 'properties', 'contracts'].map((t) =>
      supabase
        .channel(`dash_${t}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: t }, () => fetchCounts())
        .subscribe()
    );
    return () => {
      channels.forEach((c) => {
        try { supabase.removeChannel(c); } catch {}
      });
    };
  }, [fetchCounts]);

  return { stats, loading, error, refetch: fetchCounts };
}
