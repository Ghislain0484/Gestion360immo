// src/hooks/useSupabaseData.ts
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook générique de listing + temps réel.
 * - agencyScoped: true => filtre agency_id = user.agencyId (pour les users d'agence)
 * - admin plateforme: pas de filtre par défaut
 * Retourne aussi refetch()
 */
type TableName = 'owners' | 'tenants' | 'properties' | 'contracts';

type FetchOptions = {
  table: TableName;
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
  const agencyId = useMemo(() => (admin ? null : user?.agencyId ?? null), [admin, user?.agencyId]);

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

    // realtime: refetch on any change
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
 * Temps réel simple: notifie via onChange()
 */
export function useRealtimeData(table: TableName, onChange?: () => void) {
  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    try {
      const channel = supabase
        .channel(`${table}_rt`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange?.())
        .subscribe(() => setSubscribed(true));
      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      setSubscribed(false);
    }
  }, [table, onChange]);
  return { subscribed };
}

/**
 * Stats tableau de bord
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
      const tables: TableName[] = ['owners', 'tenants', 'properties', 'contracts'];
      const results = await Promise.all(
        tables.map(async (t) => {
          let q = supabase.from(t).select('*', { count: 'exact', head: true });
          if (agencyId) q = q.eq('agency_id', agencyId);
          const { count, error } = await q;
          if (error) throw error;
          return count ?? 0;
        })
      );
      setStats({ owners: results[0], tenants: results[1], properties: results[2], contracts: results[3] });
    } catch (e: any) {
      setError(e?.message ?? 'Erreur chargement statistiques');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchCounts();
    const channels = (['owners', 'tenants', 'properties', 'contracts'] as TableName[]).map((t) =>
      supabase
        .channel(`dash_${t}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: t }, () => fetchCounts())
        .subscribe()
    );
    return () => {
      channels.forEach((c) => {
        try {
          supabase.removeChannel(c);
        } catch {}
      });
    };
  }, [fetchCounts]);

  return { stats, loading, error, refetch: fetchCounts };
}

/**
 * Création générique (INSERT) avec gestion agency_id.
 * - Si admin plateforme: insert tel quel (tu peux passer agency_id explicitement si besoin)
 * - Si user d'agence: injecte automatiquement agency_id = user.agencyId.
 */
type CreatePayload = Record<string, any>;

export function useSupabaseCreate(table: TableName, options?: { agencyScoped?: boolean }) {
  const { user, admin } = useAuth();
  const agencyScoped = options?.agencyScoped ?? true;

  const create = useCallback(
    async (payload: CreatePayload) => {
      if (!supabase) throw new Error('Supabase non configuré');
      let toInsert = { ...payload };

      if (!admin && agencyScoped) {
        const agencyId = user?.agencyId;
        if (!agencyId) throw new Error("Aucune agence liée à l'utilisateur");
        toInsert = { ...toInsert, agency_id: toInsert.agency_id ?? agencyId };
      }

      const { data, error } = await supabase.from(table).insert(toInsert).select().single();
      if (error) throw error;
      return data;
    },
    [admin, agencyScoped, table, user?.agencyId]
  );

  return { create };
}

/**
 * Suppression générique (DELETE) sécurisée par RLS.
 * - Si user d'agence: la policy doit empêcher de supprimer hors de son agence.
 * - Si admin plateforme: la policy doit autoriser selon ton modèle (souvent via is_platform_admin()).
 */
export function useSupabaseDelete(table: TableName, options?: { agencyScoped?: boolean }) {
  const { user, admin } = useAuth();
  const agencyScoped = options?.agencyScoped ?? true;

  const remove = useCallback(
    async (id: string) => {
      if (!supabase) throw new Error('Supabase non configuré');
      let query = supabase.from(table).delete().eq('id', id);

      // Optionnel: forcer un filtre agency_id côté client (RLS reste la protection forte)
      if (!admin && agencyScoped && user?.agencyId) {
        query = query.eq('agency_id', user.agencyId);
      }

      const { error } = await query;
      if (error) throw error;
      return true;
    },
    [admin, agencyScoped, table, user?.agencyId]
  );

  return { remove };
}
