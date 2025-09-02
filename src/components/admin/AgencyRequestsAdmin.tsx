
import React, { useEffect, useState } from 'react';
import { dbService } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { toast } from 'react-hot-toast';
import { CheckCircle, RefreshCw } from 'lucide-react';

type RequestRow = {
  id: string;
  agency_name: string | null;
  commercial_register: string | null;
  director_first_name: string | null;
  director_last_name: string | null;
  director_email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  logo_url: string | null;
  is_accredited: boolean | null;
  accreditation_number: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  created_at?: string;
  approved_at?: string | null;
  agency_id?: string | null;
};

export default function AgencyRequestsAdmin() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await dbService.getAllRegistrationRequests();
      setRows(data as RequestRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error("Impossible de charger les demandes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    try {
      setApprovingId(id);
      // Si tu as une RPC côté DB, préfère:
      // await dbService.approveAgencyRequestViaRpc(id);
      const res = await dbService.approveAgencyRequestDirect(id);
      toast.success(`Agence approuvée: ${res?.agency_name ?? 'OK'}`);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error("Échec de l'approbation");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Demandes d’inscription d’agences</h2>
        <Button variant="outline" onClick={load} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Actualiser
        </Button>
      </div>

      {rows.length === 0 && !loading && (
        <p className="text-sm text-gray-500">Aucune demande pour le moment.</p>
      )}

      <div className="grid grid-cols-1 gap-4">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{r.agency_name ?? '—'}</h3>
                  <span
                    className={
                      r.status === 'approved'
                        ? 'text-green-700 bg-green-100 text-xs px-2 py-0.5 rounded'
                        : r.status === 'pending'
                        ? 'text-amber-700 bg-amber-100 text-xs px-2 py-0.5 rounded'
                        : 'text-gray-700 bg-gray-100 text-xs px-2 py-0.5 rounded'
                    }
                  >
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  RCCM: {r.commercial_register ?? '—'} • Ville: {r.city ?? '—'}
                </p>
                <p className="text-sm text-gray-600">
                  Directeur: {r.director_first_name ?? '—'} {r.director_last_name ?? '—'} • {r.director_email ?? '—'}
                </p>
                <p className="text-xs text-gray-500">
                  Créée: {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                </p>
                {r.approved_at && (
                  <p className="text-xs text-gray-500">Approuvée: {new Date(r.approved_at).toLocaleString()}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {r.status !== 'approved' && (
                  <Button
                    onClick={() => approve(r.id)}
                    disabled={approvingId === r.id}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className={approvingId === r.id ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
                    {approvingId === r.id ? 'Approbation…' : 'Approuver'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
