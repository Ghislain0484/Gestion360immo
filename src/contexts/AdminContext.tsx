import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlatformStats } from '../types/db';
import { getPlatformStats } from '../lib/adminApi';
import { dbService } from '../lib/supabase';

interface AdminContextType {
    platformStats: PlatformStats | null;
    pendingRequestsCount: number;
    loading: boolean;
    refreshStats: () => Promise<void>;
    lastRefresh: Date | null;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const refreshStats = useCallback(async () => {
        try {
            setLoading(true);

            // Récupération parallèle des stats et des demandes
            const [stats, requests] = await Promise.all([
                getPlatformStats(),
                dbService.agencyRegistrationRequests.getAll({ status: 'pending' }),
            ]);

            setPlatformStats(stats);
            setPendingRequestsCount(requests?.length || 0);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Erreur lors du refresh des stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Chargement initial
        refreshStats();

        // Refresh automatique toutes les 2 minutes
        const interval = setInterval(refreshStats, 120000);

        return () => clearInterval(interval);
    }, [refreshStats]);

    const value: AdminContextType = {
        platformStats,
        pendingRequestsCount,
        loading,
        refreshStats,
        lastRefresh,
    };

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
