import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Harmonized data hook:
 * - Never uses demo/local data in production
 * - Works for both platform admins (no agency scope) and agency users (scoped by agency_id)
 * - Subscribes to realtime changes when possible
 */

type FetchOptions = {
  table: 'owners' | 'tenants' | 'properties' | 'contracts';
  agencyScoped?: boolean; // default true; if false, no agency filter
  orderBy?: { column: string; ascending?: boolean };
};

export function useSupabaseData<T = any>({ table, agencyScoped = true, orderBy }: FetchOptions) {
  const { user, admin } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<ReturnType<typeof supabase['channel']> | null>(null);

  const isProd = import.meta.env.MODE === 'production';
  const isConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  const agencyId = useMemo(() => {
    // Platform admin: no agency filter by default unless explicitly requested
    if (admin) return null; // admin sees cross-agency views in admin screens
    return user?.agencyId ?? null;
  }, [admin, user?.agencyId]);

  useEffect(() => {
    if (!isConfigured || !supabase) {
      if (isProd) {
        setError('Supabase non configuré');
        return;
      }
    }

    let isCancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!supabase) throw new Error('Supabase non disponible');
        let query = supabase.from(table).select('*');
        if (agencyScoped && agencyId) query = query.eq('agency_id', agencyId);
        if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });

        const { data: rows, error: qErr } = await query;
        if (qErr) throw qErr;
        if (!isCancelled) setData((rows ?? []) as T[]);
      } catch (e: any) {
        if (!isCancelled) setError(e?.message ?? 'Erreur de chargement');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    // Initial fetch once we know the agency scope (or admin)
    fetchData();

    // Realtime subscription
    try {
      if (subRef.current) {
        supabase.removeChannel(subRef.current);
        subRef.current = null;
      }
      const channel = supabase
        .channel(`${table}_changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (_payload) => {
          // naive refetch on any change; can be optimized with patching
          fetchData();
        })
        .subscribe();
      subRef.current = channel;
    } catch {}

    return () => {
      isCancelled = true;
      try {
        if (subRef.current) supabase.removeChannel(subRef.current);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, agencyScoped, agencyId, orderBy?.column, orderBy?.ascending, isConfigured]);

  return { data, loading, error };
}
