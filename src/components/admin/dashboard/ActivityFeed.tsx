import React from 'react';
import { Activity, CheckCircle, XCircle, Clock, Building2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';

interface ActivityItem {
    id: string;
    type: 'approval' | 'rejection' | 'subscription' | 'agency_created';
    title: string;
    description: string;
    timestamp: string;
    status?: 'success' | 'error' | 'pending';
}

interface ActivityFeedProps {
    activities?: ActivityItem[];
    loading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities = [], loading }) => {
    // Activités par défaut si aucune n'est fournie
    const defaultActivities: ActivityItem[] = [
        {
            id: '1',
            type: 'approval',
            title: 'Nouvelle agence approuvée',
            description: 'Agence Immobilière du Centre a été validée',
            timestamp: new Date().toISOString(),
            status: 'success',
        },
        {
            id: '2',
            type: 'subscription',
            title: 'Nouvel abonnement Premium',
            description: 'Agence Prestige a souscrit au plan Premium',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'success',
        },
    ];

    const displayActivities = activities.length > 0 ? activities : defaultActivities;

    const getActivityIcon = (type: string, status?: string) => {
        switch (type) {
            case 'approval':
                return <CheckCircle className="h-5 w-5 text-emerald-600" />;
            case 'rejection':
                return <XCircle className="h-5 w-5 text-red-600" />;
            case 'subscription':
                return <Activity className="h-5 w-5 text-blue-600" />;
            case 'agency_created':
                return <Building2 className="h-5 w-5 text-indigo-600" />;
            default:
                return <Clock className="h-5 w-5 text-slate-600" />;
        }
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'success':
                return <Badge variant="success" size="sm">Succès</Badge>;
            case 'error':
                return <Badge variant="danger" size="sm">Erreur</Badge>;
            case 'pending':
                return <Badge variant="warning" size="sm">En attente</Badge>;
            default:
                return null;
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        return date.toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <Card className="border-none bg-white/90 shadow-md">
                <div className="p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border-none bg-white/90 shadow-md">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Activité récente</h3>
                        <p className="text-sm text-slate-500">Dernières actions sur la plateforme</p>
                    </div>
                    <Activity className="h-5 w-5 text-slate-400" />
                </div>

                {displayActivities.length > 0 ? (
                    <div className="space-y-3">
                        {displayActivities.map((activity, index) => (
                            <div
                                key={activity.id}
                                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${index === 0 ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                                    {getActivityIcon(activity.type, activity.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-slate-900 text-sm">{activity.title}</p>
                                        {getStatusBadge(activity.status)}
                                    </div>
                                    <p className="text-xs text-slate-600">{activity.description}</p>
                                    <p className="text-xs text-slate-400 mt-1">{formatTimestamp(activity.timestamp)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-6 text-center py-8">
                        <Activity className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Aucune activité récente</p>
                    </div>
                )}

                {displayActivities.length > 5 && (
                    <div className="mt-4 text-center">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Voir toute l'activité →
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
};
