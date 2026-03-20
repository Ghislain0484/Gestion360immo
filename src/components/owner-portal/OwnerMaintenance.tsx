import React, { useState, useEffect } from 'react';
import { Wrench, CheckCircle2, Clock, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/config';

export const OwnerMaintenance: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        // Supabase RLS will filter tickets for the owner's properties if set up correctly
        // We'll join via property to get property details
        const { data } = await supabase
          .from('tickets')
          .select(`
            *,
            property:properties ( id, title )
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        // Filter tickets that have an associated property to simulate RLS for now just in case
        setTickets(data?.filter((t: any) => t.property) || []);
      } catch (err) {
        console.error('Error fetching maintenance tickets', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">En attente</Badge>;
      case 'in_progress':
        return <Badge variant="info" className="bg-blue-50 text-blue-700 border-blue-200">En cours</Badge>;
      case 'resolved':
        return <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">Résolu</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Info className="w-5 h-5 text-rose-500" />;
      case 'medium':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'low':
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/4 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suivi des Travaux</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualisez les demandes d'intervention et travaux sur vos biens.
          </p>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
          <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Wrench className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Aucun travail en cours</h3>
          <p className="text-slate-500 mt-1">Tous vos biens sont en parfait état, aucune intervention nécessaire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="p-6 hover:shadow-md transition-shadow border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(ticket.priority)}
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                      {ticket.priority === 'high' ? 'Urgent' : ticket.priority === 'medium' ? 'Normal' : 'Mineur'}
                    </span>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>

                <h3 className="font-bold text-lg text-slate-900 mb-2">{ticket.title}</h3>
                <p className="text-slate-600 text-sm line-clamp-3 mb-4">{ticket.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Bien concerné :</span>
                  <span className="font-medium text-slate-900 truncate max-w-[150px]" title={ticket.property?.title}>
                    {ticket.property?.title}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Date :</span>
                  <span className="font-medium text-slate-900 text-right">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
