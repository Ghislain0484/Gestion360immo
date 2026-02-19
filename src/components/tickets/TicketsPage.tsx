import React, { useState, useEffect } from 'react';
import { Plus, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { TicketModal } from './TicketModal';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';

export const TicketsPage: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const fetchTickets = async () => {
        setIsLoading(true);
        let query = supabase
            .from('tickets')
            .select(`
        *,
        property:properties(title, business_id),
        owner:owners(first_name, last_name)
      `)
            .eq('agency_id', user?.agency_id)
            .order('created_at', { ascending: false });

        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        const { data, error } = await query;

        if (error) {
            toast.error('Erreur lors du chargement des tickets');
            console.error(error);
        } else {
            setTickets(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTickets();
    }, [user, filterStatus]);

    const handleEdit = (ticket: any) => {
        setSelectedTicket(ticket);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedTicket(null);
        setIsModalOpen(false);
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            open: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-yellow-100 text-yellow-800',
            resolved: 'bg-green-100 text-green-800',
            closed: 'bg-gray-100 text-gray-800',
        };
        const labels = {
            open: 'Ouvert',
            in_progress: 'En cours',
            resolved: 'Résolu',
            closed: 'Fermé',
        };
        return (
            <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold', styles[status as keyof typeof styles] || styles.closed)}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'urgent': return <AlertCircle className="text-red-500 w-4 h-4" />;
            case 'high': return <AlertCircle className="text-orange-500 w-4 h-4" />;
            case 'medium': return <Clock className="text-yellow-500 w-4 h-4" />;
            case 'low': return <CheckCircle className="text-blue-500 w-4 h-4" />;
            default: return <Clock className="text-gray-400 w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Travaux & Maintenance</h1>
                    <p className="text-gray-500 mt-1">Suivi des interventions et maintenance</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nouveau Ticket</span>
                </button>
            </div>

            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <Filter className="text-gray-400 w-5 h-5" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                        <option value="all">Tous les status</option>
                        <option value="open">Ouverts</option>
                        <option value="in_progress">En cours</option>
                        <option value="resolved">Résolus</option>
                        <option value="closed">Fermés</option>
                    </select>
                </div>
            </Card>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                </div>
            ) : tickets.length === 0 ? (
                <EmptyState
                    icon="clipboard" // fallback if not found
                    title="Aucun ticket"
                    description="Créez un ticket pour suivre un état des lieux ou des travaux."
                />
            ) : (
                <div className="grid gap-4">
                    {tickets.map((ticket) => (
                        <Card key={ticket.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEdit(ticket)}>
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-4">
                                        <div className={clsx(
                                            "p-3 rounded-lg",
                                            ticket.priority === 'urgent' ? "bg-red-50" : "bg-primary-50"
                                        )}>
                                            {/* <Tool className={clsx("w-6 h-6", ticket.priority === 'urgent' ? "text-red-600" : "text-primary-600")} /> */}
                                            {getPriorityIcon(ticket.priority)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                                                {ticket.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {ticket.property?.title} • {ticket.property?.business_id}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                <span>Créé le {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
                                                <span>•</span>
                                                <span>Imputable à : <span className="font-medium capitalize">{ticket.charge_to === 'owner' ? 'Propriétaire' : ticket.charge_to === 'agency' ? 'Agence' : 'Locataire'}</span></span>
                                                {ticket.cost > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-semibold text-gray-700">{ticket.cost.toLocaleString('fr-FR')} FCFA</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {getStatusBadge(ticket.status)}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <TicketModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={fetchTickets}
                ticket={selectedTicket}
            />
        </div>
    );
};
