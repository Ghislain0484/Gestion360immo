cat > src/hooks/useSupabaseData.ts <<'TS'
import { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';

// --- UUID guard helper (production-safe) ---
const isUuid = (v?: string | null): boolean => !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

type DashboardData = {
  totalProperties: number;
  occupiedProperties: number;
  unpaidTenants: number;
  monthlyRevenue: number;
  activeContracts: number;
  occupancyRate: number;
};

export function useSupabaseData(user?: { agencyId?: string | null }) {
  const [owners, setOwners] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData>({
    totalProperties: 0,
    occupiedProperties: 0,
    unpaidTenants: 0,
    monthlyRevenue: 0,
    activeContracts: 0,
    occupancyRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // ✅ ne JAMAIS tomber sur un id "demo" en prod
      const agencyId = user?.agencyId ?? null;

      if (!isUuid(agencyId)) {
        console.warn('⏭️ agencyId invalide/absent — skip requêtes Supabase');
        setOwners([]);
        setProperties([]);
        setTenants([]);
        setContracts([]);
        setDashboard({
          totalProperties: 0,
          occupiedProperties: 0,
          unpaidTenants: 0,
          monthlyRevenue: 0,
          activeContracts: 0,
          occupancyRate: 0,
        });
        return;
      }

      setLoading(true);
      setError(null);

      // Chargements parallèles
      const [ownersRes, propsRes, tenantsRes, contractsRes] = await Promise.all([
        dbService.getOwners(agencyId),
        dbService.getProperties(agencyId),
        dbService.getTenants(agencyId),
        dbService.getContracts(agencyId),
      ]);

      setOwners(ownersRes);
      setProperties(propsRes);
      setTenants(tenantsRes);
      setContracts(contractsRes);

      // Calcul dashboard simple
      const occupied = propsRes.filter((p: any) => p.status === 'occupied').length;
      const unpaid = tenantsRes.filter((t: any) => t.payment_status === 'late' || t.payment_status === 'irregular').length;
      const active = contractsRes.filter((c: any) => c.status === 'active').length;
      const monthlyRevenue = contractsRes.reduce((sum: number, c: any) => sum + (c.monthly_rent || 0), 0);

      setDashboard({
        totalProperties: propsRes.length,
        occupiedProperties: occupied,
        unpaidTenants: unpaid,
        monthlyRevenue,
        activeContracts: active,
        occupancyRate: propsRes.length ? Math.round((occupied / propsRes.length) * 100) : 0,
      });

    } catch (e: any) {
      console.error('❌ useSupabaseData error:', e);
      setError(e?.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // recharge à chaque changement d’agence
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.agencyId]);

  return {
    owners,
    properties,
    tenants,
    contracts,
    dashboard,
    loading,
    error,
    reload: fetchData,
  };
}

/* --- Compatibilité: réexport des anciens hooks --- */
export function useRealtimeData(user?: { agencyId?: string | null }) {
  // même logique que useSupabaseData
  return useSupabaseData(user);
}

export function useDashboardStats(user?: { agencyId?: string | null }) {
  // expose uniquement les stats + états
  const { dashboard, loading, error, reload } = useSupabaseData(user);
  return { dashboard, loading, error, reload };
}
TS
