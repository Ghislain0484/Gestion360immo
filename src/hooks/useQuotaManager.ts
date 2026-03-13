import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeData } from './useSupabaseData';
import { dbService } from '../lib/supabase';

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
    const [agencyPlan, setAgencyPlan] = useState<string>('basic');

    // Récupérer les détails de l'agence pour le plan
    useEffect(() => {
        if (agencyId) {
            dbService.agencies.getById(agencyId).then(agency => {
                if (agency?.plan_type) {
                    setAgencyPlan(agency.plan_type.toLowerCase());
                }
            });
        }
    }, [agencyId]);
    
    // On récupère les compteurs actuels pour l'agence
    const { data: properties } = useRealtimeData(dbService.properties.getAll, 'properties', { agency_id: agencyId || '' });
    const { data: tenants } = useRealtimeData(dbService.tenants.getAll, 'tenants', { agency_id: agencyId || '' });
    const { data: users } = useRealtimeData(dbService.users.getAll, 'users_profiles', { agency_id: agencyId || '' });

    const config = QUOTAS[agencyPlan] || QUOTAS.basic;

    const stats = useMemo(() => ({
        properties: {
            current: properties?.length || 0,
            max: config.maxProperties,
            isReached: (properties?.length || 0) >= config.maxProperties
        },
        tenants: {
            current: tenants?.length || 0,
            max: config.maxTenants,
            isReached: (tenants?.length || 0) >= config.maxTenants
        },
        users: {
            current: users?.length || 0,
            max: config.maxUsers,
            isReached: (users?.length || 0) >= config.maxUsers
        }
    }), [properties, tenants, users, config]);

    const checkQuota = (type: 'properties' | 'tenants' | 'users') => {
        return !stats[type].isReached;
    };

    return {
        stats,
        checkQuota,
        plan: agencyPlan,
        isEnterprise: agencyPlan === 'enterprise'
    };
};
