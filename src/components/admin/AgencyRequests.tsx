import React, { useEffect, useMemo, useState } from "react";
import {
  listPendingRegistrationRequests,
  updateRegistrationStatus,
  approveAndCreateAgency,
} from "@/lib/adminApi";

type RequestItem = {
  id: string;
  agency_name: string;
  commercial_register?: string | null;
  director_first_name?: string | null;
  director_last_name?: string | null;
  director_email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  status: string | null;
  created_at?: string | null;
};

type Props = {
  autoCreateAgencyOnApprove?: boolean; // true => approve + insert agencies
};

const AgencyRequests: React.FC<Props> = ({ autoCreateAgencyOnApprove = false }) => {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasItems = useMemo(() => items.length > 0, [items]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listPendingRegistrationRequests(200);
      setItems(rows as any);
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onDecision = async (req: RequestItem, status: "approved" | "rejected") => {
    setError(null);
    setActionId(req.id);

    // Optimistic UI
    const prev = items;
    setItems((s) => s.filter((x) => x.id !== req.id));
    try {
      if (status === "approved" && autoCreateAgencyOnApprove) {
        await approveAndCreateAgency(req);
      } else {
        await updateRegistrationStatus(req.id, status);
      }
    } catch (e: any) {
      setItems(prev); // rollback
      setError(e?.message ?? "Action impossible");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Demandes d’inscription d’agence</h2>
        <button
          onClick={fetchData}
          className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
          disabled={loading}
        >
          {loading ? "Actualisation..." : "Rafraîchir"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-100 p-2 rounded">{error}</div>
      )}

      {!hasItems && !loading && (
        <div className="text-sm text-gray-500">Aucune demande en attente.</div>
      )}

      <div className="grid gap-3">
        {items.map((r) => (
          <div key={r.id} className="rounded-lg border p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                {r.agency_name}
                {r.city ? <span className="text-gray-500"> — {r.city}</span> : null}
              </div>
              <div className="text-xs text-gray-500">
                {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
              </div>
            </div>

            <div className="text-sm text-gray-700">
              <div>
                <span className="font-semibold">Dir.:</span>{" "}
                {[r.director_first_name, r.director_last_name].filter(Boolean).join(" ") || "—"}
              </div>
              <div>
                <span className="font-semibold">Email:</span> {r.director_email || "—"}
              </div>
              <div>
                <span className="font-semibold">Tél.:</span> {r.phone || "—"}
              </div>
              <div>
                <span className="font-semibold">Adresse:</span> {r.address || "—"}
              </div>
              <div>
                <span className="font-semibold">RCCM/Registre:</span> {r.commercial_register || "—"}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onDecision(r, "approved")}
                disabled={actionId === r.id}
                className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
              >
                {actionId === r.id ? "Validation..." : "Approuver"}
              </button>
              <button
                onClick={() => onDecision(r, "rejected")}
                disabled={actionId === r.id}
                className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
              >
                {actionId === r.id ? "Refus..." : "Refuser"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgencyRequests;
export { AgencyRequests };
