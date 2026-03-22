import React from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { clsx } from 'clsx';

interface PropertyYieldProps {
  monthlyRent?: number;
  propertyValue?: number;
  className?: string;
}

export const PropertyYield: React.FC<PropertyYieldProps> = ({ monthlyRent, propertyValue, className }) => {
  if (!monthlyRent || !propertyValue || propertyValue <= 0) return null;

  const annualRent = monthlyRent * 12;
  const yieldPercentage = (annualRent / propertyValue) * 100;

  // Déterminer la couleur selon le rendement (ex: < 4% moyen, 4-7% bon, > 7% très bon)
  const getYieldColor = (val: number) => {
    if (val < 4) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
    if (val < 8) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
    return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
  };

  return (
    <div className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider", getYieldColor(yieldPercentage), className)}>
      <TrendingUp size={14} />
      <span>Rendement: {yieldPercentage.toFixed(1)}% / an</span>
      <div className="group relative">
        <Info size={12} className="opacity-50 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] normal-case font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
          Calculé selon : (Loyer annuel / Valeur du bien) × 100
        </div>
      </div>
    </div>
  );
};
