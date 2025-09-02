import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { dbService } from '../../lib/supabase';
import { AgencyRegistrationRequest, RegistrationStatus } from '../../types/db';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export const AgencyRequests: React.FC = () => {
  const [rows, setRows] = useState<AgencyRegistrationRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Fonction pour afficher les notifications toast
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Charger les demandes
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dbService.agencyRegistrationRequests.getAll();
      setRows(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des demandes:', err);
      const errorMessage = err.message || 'Erreur lors du chargement des demandes';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Approuver une demande
  const approve = useCallback(
    async (id: string) => {
      setApproving(id);
      try {
        await dbService.agencyRegistrationRequests.approve(id);
        await load();
        showToast('Demande approuvée avec succès ✅', 'success');
      } catch (err: any) {
        console.error('Erreur lors de l’approbation:', err);
        const errorMessage = err.message || 'Erreur lors de l’approbation';
        showToast(errorMessage, 'error');
      } finally {
        setApproving(null);
      }
    },
    [load, showToast]
  );

  // Rejeter une demande
  const reject = useCallback(
    async (id: string) => {
      setRejecting(id);
      const reason = prompt('Raison du rejet (optionnel):');
      try {
        await dbService.agencyRegistrationRequests.reject(id, reason || undefined);
        await load();
        showToast(`Demande rejetée${reason ? ` : ${reason}` : ''} ✅`, 'success');
      } catch (err: any) {
        console.error('Erreur lors du rejet:', err);
        const errorMessage = err.message || 'Erreur lors du rejet';
        showToast(errorMessage, 'error');
      } finally {
        setRejecting(null);
      }
    },
    [load, showToast]
  );

  // Déterminer la couleur et le libellé du statut
  const getStatusColor = (status: RegistrationStatus): 'success' | 'danger' | 'warning' => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status: RegistrationStatus): string => {
    switch (status) {
      case 'approved':
        return 'Approuvée';
      case 'rejected':
        return 'Rejetée';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Demandes d’inscription</h2>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button variant="outline" onClick={load}>
          Réessayer
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Demandes d’inscription</h2>
        <div className="flex gap-2">
          <Badge variant="warning" size="sm">
            {rows.filter((r) => r.status === 'pending').length} en attente
          </Badge>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? 'Chargement…' : 'Rafraîchir'}
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

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
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.agency_name}</td>
                <td className="px-3 py-2">{r.commercial_register}</td>
                <td className="px-3 py-2">
                  {r.director_first_name} {r.director_last_name}
                </td>
                <td className="px-3 py-2">{r.director_email}</td>
                <td className="px-3 py-2">{r.city}</td>
                <td className="px-3 py-2">
                  <Badge variant={getStatusColor(r.status)}>{getStatusLabel(r.status)}</Badge>
                </td>
                <td className="px-3 py-2">
                  {new Date(r.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approve(r.id)}
                    disabled={approving === r.id || rejecting === r.id || r.status !== 'pending'}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {approving === r.id ? 'Approbation…' : 'Approuver'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => reject(r.id)}
                    disabled={approving === r.id || rejecting === r.id || r.status !== 'pending'}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {rejecting === r.id ? 'Rejet…' : 'Rejeter'}
                  </Button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>
                  Aucune demande.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};