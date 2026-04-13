import React, { useState, useEffect } from 'react';
import { Shield, Clock, User, FileText, Trash2, Search, Filter, AlertCircle, Eye } from 'lucide-react';
import { dbService } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { AuditLog } from '../../types/db';

export const AuditLogsPage: React.FC = () => {
    const { agencyId } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        if (!agencyId) return;

        const loadLogs = async () => {
            try {
                // Fetch directily using our service which filters by agency (since we added agency_id to RLS)
                const data = await dbService.auditLogs.getAll({ limit: 100 });
                setLogs(data);
            } catch (error) {
                console.error('Error loading audit logs:', error);
            } finally {
                setLoading(false);
            }
        };

        loadLogs();
    }, [agencyId]);

    const formatTableName = (name: string) => {
        const map: Record<string, string> = {
            'tenants': 'Locataire',
            'owners': 'Propriétaire',
            'properties': 'Bien Immobilier',
            'contracts': 'Contrat de Bail',
            'rent_receipts': 'Quittance de Loyer',
            'modular_transactions': 'Mouvement de Caisse',
            'owner_transactions': 'Reversement Propriétaire'
        };
        return map[name] || name;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-500">Chargement du journal d'audit...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-7 h-7 text-primary-600" />
                        Journal d'Audit
                    </h1>
                    <p className="text-gray-500 text-sm">Traçabilité des actions sensibles et suppressions</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List of logs */}
                <div className="lg:col-span-2 space-y-4">
                    {logs.length === 0 ? (
                        <Card className="p-12 text-center text-gray-500">
                             <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                             <p>Aucune action critique enregistrée pour le moment.</p>
                        </Card>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date & Heure</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Action</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Élément</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="text-sm text-gray-700">
                                                        {new Date(log.created_at).toLocaleString('fr-FR')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant={log.action === 'DELETE' ? 'danger' : 'secondary'} className="px-2 py-0.5 text-[10px]">
                                                    {log.action}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-gray-900">
                                                {formatTableName(log.table_name)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => setSelectedLog(log)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Details Panel */}
                <div className="space-y-4">
                    {selectedLog ? (
                        <Card className="p-6 sticky top-6 border-l-4 border-l-primary-600 animate-slide-in-right">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center justify-between">
                                Détails de l'action
                                <Badge variant="secondary">{selectedLog.record_id?.slice(0, 8)}</Badge>
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Entité</p>
                                            <p className="font-semibold text-gray-900">{formatTableName(selectedLog.table_name)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Horodatage</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {new Date(selectedLog.created_at).toLocaleString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-900 rounded-xl overflow-hidden shadow-inner">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest flex items-center gap-2">
                                            <FileText className="w-3 h-3" /> Données Supprimées (Snapshot)
                                        </span>
                                    </div>
                                    <pre className="text-[10px] text-primary-200 font-mono overflow-auto max-h-[300px] p-2 custom-scrollbar">
                                        {JSON.stringify(selectedLog.old_values || {}, null, 2)}
                                    </pre>
                                </div>

                                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-blue-900 font-bold mb-1 italic">Conformité GICO</p>
                                        <p className="text-[10px] text-blue-700 leading-relaxed">
                                            Ce log constitue une preuve numérique de l'action effectuée par un administrateur. 
                                            L'IP source est masquée pour la démo mais active en production.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/50">
                            <Shield className="w-12 h-12 mb-4 opacity-10" />
                            <p className="text-sm">Sélectionnez une action dans la liste pour voir les détails de la suppression.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
