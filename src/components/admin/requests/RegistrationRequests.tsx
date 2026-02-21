import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Building2, User, Mail, Phone, MapPin } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { dbService } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { AgencyRegistrationRequest } from '../../../types/db';

export const RegistrationRequests: React.FC = () => {
    const [requests, setRequests] = useState<AgencyRegistrationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await dbService.agencyRegistrationRequests.getAll({});
            setRequests(data || []);
        } catch (error: any) {
            console.error('[fetchRequests] Erreur:', error);
            toast.error('Erreur lors du chargement des demandes');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request: AgencyRegistrationRequest) => {
        if (processingId) return;
        setProcessingId(request.id);
        console.log('[Approve] Debut approbation:', request.id, request.agency_name);
        try {
            const result = await dbService.agencyRegistrationRequests.approve(request.id);
            console.log('[Approve] Succes:', result);
            toast.success('Agence approuvee et creee avec succes !');
            await fetchRequests();
        } catch (error: any) {
            console.error('[Approve] ERREUR COMPLETE:', error);
            console.error('[Approve] Message:', error?.message);
            toast.error(`Erreur approbation : ${error?.message || JSON.stringify(error)}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (request: AgencyRegistrationRequest) => {
        if (processingId) return;
        setProcessingId(request.id);
        console.log('[Reject] Debut rejet:', request.id);
        try {
            await dbService.agencyRegistrationRequests.reject(request.id, 'Rejetee par administrateur');
            console.log('[Reject] Succes');
            toast.success('Demande rejetee');
            await fetchRequests();
        } catch (error: any) {
            console.error('[Reject] ERREUR:', error?.message);
            toast.error(`Erreur rejet : ${error?.message || 'Erreur inconnue'}`);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredRequests = requests.filter((req) =>
        filter === 'all' ? true : req.status === filter
    );

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            pending: { variant: 'warning', label: 'En attente', icon: Clock },
            approved: { variant: 'success', label: 'Approuvee', icon: CheckCircle },
            rejected: { variant: 'danger', label: 'Rejetee', icon: XCircle },
        };
        const config = variants[status] || { variant: 'secondary', label: status, icon: Clock };
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} size="sm">
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
            </Badge>
        );
    };

    if (loading) {
        return (
            <Card className="border-none bg-white/90 shadow-md">
                <div className="p-6 space-y-4 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-gray-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    const pendingCount = requests.filter((r) => r.status === 'pending').length;

    return (
        <div className="space-y-6">
            {/* Filtres */}
            <Card className="border-none bg-white/90 shadow-md">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Demandes d'inscription</h3>
                            <p className="text-sm text-slate-500">
                                {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button variant={filter === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('all')}>
                                Toutes ({requests.length})
                            </Button>
                            <Button variant={filter === 'pending' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
                                En attente ({pendingCount})
                            </Button>
                            <Button variant={filter === 'approved' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('approved')}>
                                Approuvees ({requests.filter((r) => r.status === 'approved').length})
                            </Button>
                            <Button variant={filter === 'rejected' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('rejected')}>
                                Rejetees ({requests.filter((r) => r.status === 'rejected').length})
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Liste des demandes */}
            <div className="space-y-4">
                {filteredRequests.length > 0 ? (
                    filteredRequests.map((request) => (
                        <Card key={request.id} className="border-none bg-white/90 shadow-md">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                                            <Building2 className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-lg font-semibold text-slate-900">{request.agency_name}</h4>
                                                {getStatusBadge(request.status)}
                                            </div>
                                            <p className="text-sm text-slate-500">
                                                Demande du {new Date(request.created_at).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500">Directeur</p>
                                            <p className="font-medium text-gray-900">
                                                {request.director_first_name} {request.director_last_name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500">Email</p>
                                            <p className="font-medium text-gray-900">{request.director_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500">Telephone</p>
                                            <p className="font-medium text-gray-900">{request.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500">Ville</p>
                                            <p className="font-medium text-gray-900">{request.city}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 col-span-2">
                                        <Building2 className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500">Registre de commerce</p>
                                            <p className="font-medium text-gray-900">{request.commercial_register}</p>
                                        </div>
                                    </div>
                                </div>

                                {request.status === 'pending' && (
                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => handleApprove(request)}
                                            disabled={processingId === request.id}
                                            className="flex-1"
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            {processingId === request.id ? 'Traitement...' : 'Approuver'}
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleReject(request)}
                                            disabled={processingId === request.id}
                                            className="flex-1"
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            {processingId === request.id ? 'Traitement...' : 'Rejeter'}
                                        </Button>
                                    </div>
                                )}

                                {request.admin_notes && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                                        <strong>Note admin :</strong> {request.admin_notes}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="border-none bg-white/90 shadow-md">
                        <div className="p-12 text-center">
                            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Aucune demande trouvee</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};
