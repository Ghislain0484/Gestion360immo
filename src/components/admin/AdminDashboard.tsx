// src/components/admin/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
import { getPlatformStats } from "@/lib/adminApi";
import AgencyRequests from "@/components/admin/AgencyRequests";

type Stats = { pendingRequests: number; approvedAgencies: number };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ pendingRequests: 0, approvedAgencies: 0 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const s = await getPlatformStats();
        if (mounted) setStats(s);
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? "Erreur chargement stats");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Administration — Plateforme</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <div className="text-sm text-gray-500">Demandes en attente</div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : stats.pendingRequests}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm text-gray-500">Agences approuvées</div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : stats.approvedAgencies}
          </div>
        </div>
      </div>

      {err && <div className="text-sm text-red-700 bg-red-100 p-2 rounded">{err}</div>}

      {/* Liste des demandes avec actions */}
      <AgencyRequests autoCreateAgencyOnApprove={false} />
    </div>
  );
}
