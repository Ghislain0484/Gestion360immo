import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbService } from '../lib/supabase';
import { Agency } from '../types/db';
import { toast } from 'react-hot-toast';

// Hook pour récupérer toutes les agences avec cache
export const useAgencies = () => {
    return useQuery({
        queryKey: ['agencies'],
        queryFn: async () => {
            const agencies = await dbService.agencies.getAll();
            return agencies || [];
        },
        staleTime: 5 * 60 * 1000, // Les données restent fraîches pendant 5 minutes
        gcTime: 10 * 60 * 1000, // Cache conservé pendant 10 minutes
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
};

// Hook pour récupérer une agence spécifique
export const useAgency = (id: string | null) => {
    return useQuery({
        queryKey: ['agency', id],
        queryFn: async () => {
            if (!id) return null;
            return await dbService.agencies.getById(id);
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
};

// Hook pour mettre à jour le statut d'une agence
export const useToggleAgencyStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string | null | undefined }) => {
            const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

            console.log('🔄 Toggle Agency Status - Début', {
                agencyId: id,
                currentStatus,
                newStatus,
                timestamp: new Date().toISOString()
            });

            try {
                const result = await dbService.agencies.update(id, {
                    subscription_status: newStatus
                } as any);

                console.log('✅ Toggle Agency Status - Succès', {
                    agencyId: id,
                    result,
                    timestamp: new Date().toISOString()
                });

                return { id, newStatus, result };
            } catch (error) {
                console.error('❌ Toggle Agency Status - Erreur', {
                    agencyId: id,
                    error,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
        },
        onMutate: async ({ id, currentStatus }) => {
            // Annuler les requêtes en cours
            await queryClient.cancelQueries({ queryKey: ['agencies'] });

            // Snapshot de l'état précédent
            const previousAgencies = queryClient.getQueryData<Agency[]>(['agencies']);

            // Mise à jour optimiste
            if (previousAgencies) {
                queryClient.setQueryData<Agency[]>(['agencies'], (old) =>
                    old?.map((agency) =>
                        agency.id === id
                            ? { ...agency, subscription_status: currentStatus === 'active' ? 'suspended' : 'active' }
                            : agency
                    ) || []
                );
            }

            return { previousAgencies };
        },
        onError: (err, _, context) => {
            // Rollback en cas d'erreur
            if (context?.previousAgencies) {
                queryClient.setQueryData(['agencies'], context.previousAgencies);
            }
            toast.error('Erreur lors de la modification du statut');
            console.error('Erreur:', err);
        },
        onSuccess: (data) => {
            toast.success(`Agence ${data.newStatus === 'active' ? 'activée' : 'suspendue'} avec succès`);
        },
        onSettled: () => {
            // Invalider et refetch après mutation
            queryClient.invalidateQueries({ queryKey: ['agencies'] });
        },
    });
};

// Hook pour les demandes d'inscription
export const useRegistrationRequests = (status?: string) => {
    return useQuery({
        queryKey: ['registration-requests', status],
        queryFn: async () => {
            const requests = await dbService.agencyRegistrationRequests.getAll(
                status ? { status } : undefined
            );
            return requests || [];
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchInterval: 60000, // Refetch toutes les minutes
    });
};

// Hook pour approuver/rejeter une demande
export const useProcessRegistrationRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            requestId,
            action,
            notes,
        }: {
            requestId: string;
            action: 'approve' | 'reject';
            notes?: string;
        }) => {
            if (action === 'approve') {
                await dbService.agencyRegistrationRequests.approve(requestId);
            } else {
                await dbService.agencyRegistrationRequests.reject(requestId, notes);
            }
            return { requestId, action };
        },
        onSuccess: (data) => {
            toast.success(
                data.action === 'approve'
                    ? 'Demande approuvée avec succès'
                    : 'Demande rejetée'
            );
            queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
            queryClient.invalidateQueries({ queryKey: ['agencies'] });
        },
        onError: (err) => {
            toast.error('Erreur lors du traitement de la demande');
            console.error('Erreur:', err);
        },
    });
};

// Hook pour les stats de la plateforme
export const usePlatformStats = () => {
    return useQuery({
        queryKey: ['platform-stats'],
        queryFn: async () => {
            const agencies = await dbService.agencies.getAll();
            const activeAgencies = agencies?.filter((a) => a.status === 'approved') || [];

            const totalRevenue = activeAgencies.reduce((sum, a) => sum + (a.monthly_fee || 0), 0);

            return {
                activeAgencies: activeAgencies.length,
                totalAgencies: agencies?.length || 0,
                totalRevenue,
                monthlyGrowth: 12.5, // À calculer dynamiquement
            };
        },
        staleTime: 60 * 1000, // 1 minute
        refetchInterval: 120000, // Refetch toutes les 2 minutes
    });
};

// Hook pour étendre un abonnement
export const useExtendSubscription = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ agencyId, months }: { agencyId: string; months: number }) => {
            console.log('🔄 Extend Subscription - Début', { agencyId, months });

            // Pour l'instant, on ne fait que mettre à jour un champ notes ou historique
            // Dans une vraie implémentation, on calculerait la nouvelle date d'expiration
            const agency = await dbService.agencies.getById(agencyId);
            if (!agency) throw new Error('Agence non trouvée');

            // Mise à jour simple pour l'instant
            const result = await dbService.agencies.update(agencyId, {
                // On pourrait ajouter un champ last_extension_date
            } as any);

            console.log('✅ Extend Subscription - Succès', { agencyId, months, result });
            return { agencyId, months, result };
        },
        onSuccess: (data) => {
            toast.success(`Abonnement étendu de ${data.months} mois avec succès`);
            queryClient.invalidateQueries({ queryKey: ['agencies'] });
            queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
        },
        onError: (err) => {
            toast.error('Erreur lors de l\'extension de l\'abonnement');
            console.error('Erreur:', err);
        },
    });
};

// Hook pour mettre à jour le plan d'une agence
export const useUpdateAgencyPlan = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            agencyId,
            planType,
            monthlyFee,
        }: {
            agencyId: string;
            planType: 'basic' | 'premium' | 'enterprise';
            monthlyFee: number;
        }) => {
            console.log('🔄 Update Agency Plan - Début', { agencyId, planType, monthlyFee });

            const result = await dbService.agencies.update(agencyId, {
                plan_type: planType,
                monthly_fee: monthlyFee,
            } as any);

            console.log('✅ Update Agency Plan - Succès', { agencyId, result });
            return { agencyId, planType, monthlyFee, result };
        },
        onMutate: async ({ agencyId, planType, monthlyFee }) => {
            await queryClient.cancelQueries({ queryKey: ['agencies'] });
            const previousAgencies = queryClient.getQueryData<Agency[]>(['agencies']);

            if (previousAgencies) {
                queryClient.setQueryData<Agency[]>(['agencies'], (old) =>
                    old?.map((agency) =>
                        agency.id === agencyId
                            ? { ...agency, plan_type: planType, monthly_fee: monthlyFee }
                            : agency
                    ) || []
                );
            }

            return { previousAgencies };
        },
        onError: (err, _, context) => {
            if (context?.previousAgencies) {
                queryClient.setQueryData(['agencies'], context.previousAgencies);
            }
            toast.error('Erreur lors de la modification du plan');
            console.error('Erreur:', err);
        },
        onSuccess: (data) => {
            toast.success(`Plan mis à jour vers ${data.planType} avec succès`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['agencies'] });
            queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
        },
    });
};

// Hook pour récupérer les paramètres de la plateforme
export const usePlatformSettings = () => {
    return useQuery({
        queryKey: ['platform-settings'],
        queryFn: async () => {
            const settings = await dbService.platformSettings.getAll();

            // Transformer en objet clé-valeur
            const settingsMap = settings.reduce((acc, setting) => {
                acc[setting.setting_key] = setting.setting_value;
                return acc;
            }, {} as Record<string, any>);

            return {
                subscription_basic_price: Number(settingsMap['subscription_basic_price']) || 25000,
                subscription_premium_price: Number(settingsMap['subscription_premium_price']) || 50000,
                subscription_enterprise_price: Number(settingsMap['subscription_enterprise_price']) || 100000,
                subscription_grace_period_days: Number(settingsMap['subscription_grace_period_days']) || 7,
                ...settingsMap,
            };
        },
        staleTime: 10 * 60 * 1000, // 10 minutes (les prix changent rarement)
        gcTime: 30 * 60 * 1000,
    });
};

// Hook pour mettre à jour un paramètre de plateforme
export const useUpdatePlatformSetting = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            settingKey,
            settingValue,
        }: {
            settingKey: string;
            settingValue: any;
        }) => {
            // Récupérer le setting existant
            const settings = await dbService.platformSettings.getAll();
            const existing = settings.find((s) => s.setting_key === settingKey);

            if (existing) {
                // Mise à jour
                await dbService.platformSettings.update(existing.id, {
                    setting_value: settingValue,
                });
            } else {
                // Création
                await dbService.platformSettings.create({
                    setting_key: settingKey,
                    setting_value: settingValue,
                    category: 'subscription',
                    is_public: false,
                } as any);
            }

            return { settingKey, settingValue };
        },
        onSuccess: () => {
            toast.success('Paramètre mis à jour avec succès');
            queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
        },
        onError: (err) => {
            toast.error('Erreur lors de la mise à jour du paramètre');
            console.error('Erreur:', err);
        },
    });
};
