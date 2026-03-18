import { useMemo } from 'react';

interface PricingPolicy {
    shortStayPrice: number;
    longStayThreshold: number;
    longStayDiscount: number; // percentage
}

export const usePriceCalculator = (policy: PricingPolicy | null) => {
    const calculateTotal = useMemo(() => (days: number, basePrice?: number) => {
        if (!policy) return (basePrice || 0) * days;

        const effectiveBasePrice = basePrice || policy.shortStayPrice;
        
        if (days >= policy.longStayThreshold) {
            const discount = 1 - (policy.longStayDiscount / 100);
            return days * effectiveBasePrice * discount;
        }

        return days * effectiveBasePrice;
    }, [policy]);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return { calculateTotal, formatPrice };
};
