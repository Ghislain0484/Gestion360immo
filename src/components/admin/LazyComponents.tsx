import React, { lazy, Suspense } from 'react';

// Code splitting - Chargement lazy des composants lourds
const AgencyRankingsEnhanced = lazy(() => import('./rankings/AgencyRankingsEnhanced'));
const FinancialReports = lazy(() => import('./reports/FinancialReports'));
const SubscriptionPlans = lazy(() => import('./subscriptions/SubscriptionPlans'));
const ActiveSubscriptions = lazy(() => import('./subscriptions/ActiveSubscriptions'));
const RegistrationRequests = lazy(() => import('./requests/RegistrationRequests'));
const PlatformSettings = lazy(() => import('./settings/PlatformSettings'));

// Composant de chargement
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Chargement...' }) => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
            <p className="text-gray-600 font-medium">{message}</p>
        </div>
    </div>
);

// Wrapper pour Suspense avec fallback personnalisé
export const LazyComponent: React.FC<{
    children: React.ReactNode;
    fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
    <Suspense fallback={fallback || <LoadingFallback />}>
        {children}
    </Suspense>
);

// Export des composants lazy
export {
    AgencyRankingsEnhanced,
    FinancialReports,
    SubscriptionPlans,
    ActiveSubscriptions,
    RegistrationRequests,
    PlatformSettings,
    LoadingFallback,
};
