import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeData } from './useSupabaseData';
import { dbService } from '../lib/supabase';
import { usePlatformSettings } from './useAdminQueries';

export interface QuotaConfig {
    maxProperties: number;
    maxTenants: number;
    maxUsers: number;
}

const QUOTAS: Record<string, QuotaConfig> = {
    basic: { maxProperties: 10, maxTenants: 10, maxUsers: 2 },
    premium: { maxProperties: 50, maxTenants: 50, maxUsers: 5 },
    enterprise: { maxProperties: Infinity, maxTenants: Infinity, maxUsers: Infinity },
};

export const useQuotaManager = () => {
    const { agencyId } = useAuth();
    const { data: settings } = usePlatformSettings();
    const [agencyStatus, setAgencyStatus] = useState<string>('active');
    const [agencyPlan, setAgencyPlan] = useState<string>('basic');
    const [isInternalMode, setIsInternalMode] = useState<boolean>(false);
    const [subscription, setSubscription] = useState<any>(null);

    // Récupérer les détails de l'agence pour le plan et les modules
    useEffect(() => {
        if (agencyId) {
            dbService.agencies.getById(agencyId).then(agency => {
                const subRaw = (agency as any)?.subscription;
                const sub = Array.isArray(subRaw) ? subRaw[0] : subRaw;

                if (agency?.subscription_status) {
                    setAgencyStatus(agency.subscription_status);
                }
                
                const currentPlan = sub?.plan_type || agency?.plan_type;
                if (currentPlan) {
                    setAgencyPlan(currentPlan.toLowerCase());
                }
                
                if (agency?.enabled_modules?.includes('internal_mode')) {
                    setIsInternalMode(true);
                }
                
                // Subscription is joined in getById
                setSubscription(sub);
            });
        }
    }, [agencyId]);
    
    // On récupère les compteurs actuels pour l'agence
    const { data: properties } = useRealtimeData(dbService.properties.getAll, 'properties', { agency_id: agencyId || '' });
    const { data: tenants } = useRealtimeData(dbService.tenants.getAll, 'tenants', { agency_id: agencyId || '' });
    const { data: users } = useRealtimeData(dbService.users.getAll, 'users_profiles', { agency_id: agencyId || '' });

    const config = isInternalMode ? QUOTAS.enterprise : (QUOTAS[agencyPlan] || QUOTAS.basic);

    // Logic pour la période de grâce
    const gracePeriodDaysRemaining = useMemo(() => {
        if (!subscription || agencyStatus !== 'active') return 0;
        
        const nextPayment = new Date(subscription.next_payment_date);
        const today = new Date();
        
        if (today <= nextPayment) return 0; // Pas encore en retard
        
        const graceDaysAllowed = (settings as any)?.subscription_grace_period_days || 7;
        const diffTime = Math.abs(today.getTime() - nextPayment.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(0, graceDaysAllowed - diffDays);
    }, [subscription, agencyStatus, settings]);

    const stats = useMemo(() => ({
        properties: {
            current: properties?.length || 0,
            max: config.maxProperties,
            isReached: !isInternalMode && (properties?.length || 0) >= config.maxProperties,
            isNear: !isInternalMode && (properties?.length || 0) >= config.maxProperties * 0.8
        },
        tenants: {
            current: tenants?.length || 0,
            max: config.maxTenants,
            isReached: !isInternalMode && (tenants?.length || 0) >= config.maxTenants,
            isNear: !isInternalMode && (tenants?.length || 0) >= config.maxTenants * 0.8
        },
        users: {
            current: users?.length || 0,
            max: config.maxUsers,
            isReached: !isInternalMode && (users?.length || 0) >= config.maxUsers,
            isNear: !isInternalMode && (users?.length || 0) >= config.maxUsers * 0.8
        }
    }), [properties, tenants, users, config, isInternalMode]);

    const isOverLimit = useMemo(() => 
        stats.properties.isReached || stats.tenants.isReached || stats.users.isReached
    , [stats]);

    const isNearLimit = useMemo(() => 
        stats.properties.isNear || stats.tenants.isNear || stats.users.isNear
    , [stats]);

    const checkQuota = (type: 'properties' | 'tenants' | 'users') => {
        if (isInternalMode) return true;
        return !stats[type].isReached;
    };

    return {
        stats,
        checkQuota,
        plan: agencyPlan,
        status: agencyStatus,
        isEnterprise: agencyPlan === 'enterprise',
        isOverLimit,
        isNearLimit,
        gracePeriodDaysRemaining,
        subscription
    };
};
