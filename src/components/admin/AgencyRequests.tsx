// src/components/admin/AgencyRequests.tsx
import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { dbService } from '../../lib/supabase';

/*
export const AgencyRequests: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dbService.getPendingAgencyRequests();
      setRequests(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    try {
      await dbService.approveAgencyRequest(id);
      await load();
    } catch (e: any) {
      alert(`Erreur approbation: ${e.message ?? e}`);
    }
  };

  const reject = async (id: string) => {
    const reason = prompt('Raison du refus ?') ?? undefined;
    try {
      await dbService.rejectAgencyRequest(id, reason);
      await load();
    } catch (e: any) {
      alert(`Erreur rejet: ${e.message ?? e}`);
    }
  };

  if (loading) return <div className="p-6">Chargement…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      {requests.length === 0 && (
        <Card className="p-8 text-center text-gray-600">Aucune demande en attente.</Card>
      )}
      {requests.map((r) => (
        <Card key={r.id} className="p-5 flex items-center justify-between">
          <div>
            <div className="font-medium">{r.agency_name}</div>
            <div className="text-sm text-gray-600">{r.city ?? '—'} • {r.phone ?? '—'}</div>
            <div className="text-sm text-gray-500 mt-1">
              Directeur: {r.director_first_name} {r.director_last_name} • {r.director_email}
            </div>
            <div className="mt-2">
              <Badge variant="warning">pending</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => approve(r.id)}>Approuver</Button>
            <Button variant="danger" onClick={() => reject(r.id)}>Refuser</Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
*/

export const AgencyRequests: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [useRpc, setUseRpc] = useState(true); // bascule RPC / Direct

  const load = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAllRegistrationRequests();
      setRows(data);
    } catch (e) {
      console.error(e);
      alert('Erreur chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setApproving(id);
    try {
      if (useRpc) {
        await dbService.approveAgencyRequestViaRpc(id);
      } else {
        await dbService.approveAgencyRequestDirect(id);
      }
      await load();
      alert('Demande approuvée ✅');
    } catch (e: any) {
      console.error(e);
      alert(`Erreur approbation: ${e?.message || e}`);
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Demandes d’inscription</h2>
        <div className="flex gap-2">
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={useRpc} onChange={e => setUseRpc(e.target.checked)} />
            Utiliser RPC
          </label>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? 'Chargement…' : 'Rafraîchir'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Agence</th>
              <th className="px-3 py-2 text-left">RCCM</th>
              <th className="px-3 py-2 text-left">Directeur</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Ville</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.agency_name}</td>
                <td className="px-3 py-2">{r.commercial_register}</td>
                <td className="px-3 py-2">{r.director_first_name} {r.director_last_name}</td>
                <td className="px-3 py-2">{r.director_email}</td>
                <td className="px-3 py-2">{r.city}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" onClick={() => approve(r.id)} disabled={approving === r.id || r.status === 'approved'}>
                    {approving === r.id ? 'Approbation…' : 'Approuver'}
                  </Button>
                </td>
              </tr>
            ))}

            {!rows.length && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>Aucune demande.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
