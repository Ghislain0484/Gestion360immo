// src/components/admin/AgencyRequests.tsx
import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { dbService } from '../../lib/supabase';

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
