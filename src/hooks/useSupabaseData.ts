// src/hooks/useSupabaseData.ts
import { useEffect, useMemo, useState } from 'react';
import { supabase, dbService } from '@/lib/supabase';

type RealtimeOptions = {
  table: string;
  filter?: { column: string; value: any };
};

/** Flux temps-réel simple et fiable (recharge à chaque changement) */
export function useRealtimeData<T = any>(opts: RealtimeOptions) {
  const { table, filter } = opts;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const channelName = useMemo(() => `realtime:${table}`, [table]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const base = supabase.from(table).select('*');
      const { data, error } = filter ? await base.eq(filter.column, filter.value) : await base;
      if (!mounted) return;
      if (error) {
        console.error('useRealtimeData init error', error);
        setRows([]);
      } else {
        setRows((data ?? []) as T[]);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => load())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [table, filter?.column, filter?.value, channelName]);

  return { data: rows, loading };
}

/** Création générique */
export function useSupabaseCreate<T = any>(table: string) {
  return async (payload: Partial<T>) => {
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw error;
    return data as T;
  };
}

/** Suppression générique */
export function useSupabaseDelete(table: string) {
  return async (idColumn: string, idValue: any) => {
    const { error } = await supabase.from(table).delete().eq(idColumn, idValue);
    if (error) throw error;
    return true;
  };
}

/** Stats Dashboard admin (évite l’erreur “useDashboardStats is not exported”) */
export function useDashboardStats() {
  const [stats, setStats] = useState<{ agenciesApproved: number; agenciesPending: number; subscriptions: number } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const s = await dbService.getPlatformStats();
        setStats(s);
      } catch (e) {
        console.error('useDashboardStats error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return { stats, loading };
}
