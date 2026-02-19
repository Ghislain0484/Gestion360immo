import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/config';
import { useAdmin } from '../contexts/AdminContext';
import { toast } from 'react-hot-toast';

export interface Notification {
    id: string;
    type: 'request' | 'subscription' | 'payment' | 'alert' | 'system';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    data?: any;
}

// Hook pour récupérer les notifications
export const useNotifications = () => {
    const { platformStats } = useAdmin();

    return useQuery({
        queryKey: ['notifications'],
        queryFn: async (): Promise<Notification[]> => {
            const notifications: Notification[] = [];
            const now = new Date();

            // 1. Demandes d'inscription en attente
            const { data: requests } = await supabase
                .from('agency_registration_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(5);

            if (requests && requests.length > 0) {
                requests.forEach((req) => {
                    notifications.push({
                        id: `request-${req.id}`,
                        type: 'request',
                        title: 'Nouvelle demande d\'inscription',
                        message: `${req.agency_name} demande à rejoindre la plateforme`,
                        read: false,
                        created_at: req.created_at,
                        data: req,
                    });
                });
            }

            // 2. Abonnements expirant bientôt (30 jours)
            const { data: agencies } = await supabase
                .from('agencies')
                .select('id, name, created_at, subscription_status')
                .eq('subscription_status', 'active');

            if (agencies) {
                agencies.forEach((agency) => {
                    const createdDate = new Date(agency.created_at);
                    const expiryDate = new Date(createdDate);
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

                    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                        notifications.push({
                            id: `expiry-${agency.id}`,
                            type: 'alert',
                            title: 'Abonnement expirant bientôt',
                            message: `L'abonnement de ${agency.name} expire dans ${daysUntilExpiry} jours`,
                            read: false,
                            created_at: new Date().toISOString(),
                            data: { agency, daysUntilExpiry },
                        });
                    }
                });
            }

            // 3. Agences suspendues
            const { data: suspendedAgencies } = await supabase
                .from('agencies')
                .select('id, name, subscription_status, updated_at')
                .eq('subscription_status', 'suspended')
                .order('updated_at', { ascending: false })
                .limit(3);

            if (suspendedAgencies && suspendedAgencies.length > 0) {
                suspendedAgencies.forEach((agency) => {
                    notifications.push({
                        id: `suspended-${agency.id}`,
                        type: 'alert',
                        title: 'Agence suspendue',
                        message: `${agency.name} a été suspendue`,
                        read: false,
                        created_at: agency.updated_at,
                        data: agency,
                    });
                });
            }

            // Trier par date (plus récent en premier)
            return notifications.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        },
        staleTime: 60 * 1000, // 1 minute
        refetchInterval: 120000, // Refetch toutes les 2 minutes
    });
};

// Hook pour marquer une notification comme lue
export const useMarkNotificationAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            // Pour l'instant, on garde juste en mémoire
            // Dans une vraie app, on sauvegarderait dans une table notifications
            return { notificationId };
        },
        onSuccess: (data) => {
            queryClient.setQueryData<Notification[]>(['notifications'], (old) => {
                if (!old) return [];
                return old.map((notif) =>
                    notif.id === data.notificationId
                        ? { ...notif, read: true }
                        : notif
                );
            });
        },
    });
};

// Hook pour marquer toutes les notifications comme lues
export const useMarkAllNotificationsAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            return { success: true };
        },
        onSuccess: () => {
            queryClient.setQueryData<Notification[]>(['notifications'], (old) => {
                if (!old) return [];
                return old.map((notif) => ({ ...notif, read: true }));
            });
            toast.success('Toutes les notifications marquées comme lues');
        },
    });
};
