import React, { useEffect, useState } from 'react';
import { History, User, Calendar, Activity, Database } from 'lucide-react';
import { dbService } from '../../lib/supabase';
import { AuditLog } from '../../types/db';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '../ui/Badge';

interface PropertyHistoryProps {
  propertyId: string;
}

export const PropertyHistory: React.FC<PropertyHistoryProps> = ({ propertyId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await dbService.auditLogs.getByRecordId(propertyId, 'properties');
        setLogs(data);
      } catch (error) {
        console.error('❌ Erreur chargement historique:', error);
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) fetchLogs();
  }, [propertyId]);

  const getActionColor = (action: string) => {
    if (action.includes('INSERT') || action.includes('Création')) return 'success';
    if (action.includes('UPDATE') || action.includes('Mise à jour')) return 'info';
    if (action.includes('DELETE') || action.includes('Suppression')) return 'danger';
    return 'secondary';
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Non défini';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Activity className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-500">Chargement de l'historique...</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aucun historique</h3>
        <p className="text-gray-500 dark:text-gray-400">Aucune action n'a été enregistrée pour ce bien pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-6">
        <History className="w-5 h-5 mr-3 text-blue-600" />
        Historique des actions
      </h3>

      <div className="relative border-l-2 border-blue-100 dark:border-blue-900/30 ml-3 pl-8 space-y-8">
        {logs.map((log) => (
          <div key={log.id} className="relative">
            {/* Dot on timeline */}
            <div className={`absolute -left-[37px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-sm ${
              getActionColor(log.action) === 'success' ? 'bg-green-500' :
              getActionColor(log.action) === 'info' ? 'bg-blue-500' :
              getActionColor(log.action) === 'danger' ? 'bg-red-500' : 'bg-gray-500'
            }`} />

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={getActionColor(log.action)} size="sm">
                    {log.action}
                  </Badge>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {log.table_name === 'properties' ? 'Bien' : log.table_name}
                  </span>
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(new Date(log.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </div>
              </div>

              {/* Diff view (simplified) */}
              {log.new_values && typeof log.new_values === 'object' && (
                <div className="mt-2 text-sm space-y-2">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="pb-2 pr-4">Champ</th>
                          <th className="pb-2 pr-4">Ancienne valeur</th>
                          <th className="pb-2">Nouvelle valeur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(log.new_values as Record<string, any>).map(([key, value]) => {
                          const oldVal = log.old_values ? (log.old_values as any)[key] : undefined;
                          if (JSON.stringify(oldVal) === JSON.stringify(value)) return null;
                          
                          return (
                            <tr key={key} className="border-t border-gray-100 dark:border-gray-800">
                              <td className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">{key}</td>
                              <td className="py-2 pr-4 text-gray-500 dark:text-gray-500 line-through truncate max-w-[150px]">
                                {formatValue(oldVal)}
                              </td>
                              <td className="py-2 text-green-600 dark:text-green-400 font-medium truncate max-w-[150px]">
                                {formatValue(value)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-end text-xs text-gray-400">
                <User className="w-3 h-3 mr-1" />
                <span>Utilisateur #{log.user_id?.slice(0, 8) || 'Système'}</span>
                {log.ip_address && (
                  <>
                    <Database className="w-3 h-3 ml-3 mr-1" />
                    <span>{log.ip_address}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
