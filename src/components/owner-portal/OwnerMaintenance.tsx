import React, { useEffect, useState, useMemo } from 'react';
import { Wrench, Search, AlertTriangle, Clock, CheckCircle2, PauseCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v ?? 0);

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_CONFIG: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
  open:        { label: 'Ouvert',        icon: AlertTriangle, color: 'bg-rose-100 text-rose-600' },
  in_progress: { label: 'En cours',      icon: Clock,         color: 'bg-amber-100 text-amber-600' },
  resolved:    { label: 'Résolu',        icon: CheckCircle2,  color: 'bg-emerald-100 text-emerald-700' },
  closed:      { label: 'Clôturé',       icon: CheckCircle2,  color: 'bg-slate-100 text-slate-500' },
  pending:     { label: 'En attente',    icon: PauseCircle,   color: 'bg-blue-100 text-blue-600' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent:   { label: '🔴 Urgent',   color: 'bg-red-100 text-red-700' },
  high:     { label: '🟠 Élevée',   color: 'bg-orange-100 text-orange-700' },
  medium:   { label: '🟡 Moyenne',  color: 'bg-yellow-100 text-yellow-700' },
  low:      { label: '🟢 Faible',   color: 'bg-green-100 text-green-700' },
};

export const OwnerMaintenance: React.FC = () => {
  const { owner } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  useEffect(() => {
    if (!owner?.id) return;
    const load = async () => {
      setLoading(true);
      const { data: props } = await supabase
        .from('properties').select('id').eq('owner_id', owner.id);
      const propIds = (props || []).map((p: any) => p.id);

      if (propIds.length === 0) { setLoading(false); return; }

      const { data: tks } = await supabase
        .from('tickets')
        .select('id, title, description, status, priority, estimated_cost, actual_cost, created_at, updated_at, property_id, property:properties(title, location)')
        .in('property_id', propIds)
        .order('created_at', { ascending: false });

      setTickets(tks || []);
      setLoading(false);
    };
    load();
  }, [owner?.id]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return tickets.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(s) || (t.property?.title || '').toLowerCase().includes(s);
      const matchFilter = filter === 'all' || t.status === filter;
      return matchSearch && matchFilter;
    });
  }, [tickets, search, filter]);

  const summary = useMemo(() => ({
    open: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    totalEstimated: tickets.reduce((s, t) => s + (t.estimated_cost || 0), 0),
    totalActual: tickets.reduce((s, t) => s + (t.actual_cost || 0), 0),
  }), [tickets]);

  if (loading) return <div className="animate-pulse space-y-6"><div className="h-24 bg-slate-200 rounded-2xl"/><div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 bg-slate-200 rounded-2xl"/>)}</div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Travaux & Entretien</h1>
        <p className="text-slate-500 mt-1">Suivi des interventions sur vos biens</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'En cours / Ouverts', value: summary.open, color: 'text-rose-600' },
          { label: 'Résolus', value: summary.resolved, color: 'text-emerald-600' },
          { label: 'Coût Estimé Total', value: formatCurrency(summary.totalEstimated), color: 'text-amber-600' },
          { label: 'Coût Réel Total', value: formatCurrency(summary.totalActual), color: 'text-slate-700' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Rechercher un ticket ou un bien..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all','Tous'], ['open','Ouverts'], ['in_progress','En cours'], ['resolved','Résolus']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === v ? 'bg-emerald-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <Wrench className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Aucun ticket trouvé</p>
          {filter === 'all' && <p className="text-slate-400 text-sm mt-1">Aucune intervention n'est enregistrée pour vos biens.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => {
            const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG['open'];
            const priorityCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG['medium'];
            const StatusIcon = statusCfg.icon;
            return (
              <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-900">{t.title}</h3>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusCfg.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${priorityCfg.color}`}>
                          {priorityCfg.label}
                        </span>
                      </div>
                      {t.description && <p className="text-sm text-slate-500 mb-2 line-clamp-2">{t.description}</p>}
                      <p className="text-xs text-slate-400">
                        📍 {t.property?.title} · Créé le {formatDate(t.created_at)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {t.actual_cost ? (
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Coût réel</p>
                          <p className="font-bold text-slate-900">{formatCurrency(t.actual_cost)}</p>
                        </div>
                      ) : t.estimated_cost ? (
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Estimation</p>
                          <p className="font-semibold text-amber-600">{formatCurrency(t.estimated_cost)}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Coût à estimer</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
