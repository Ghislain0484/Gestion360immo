import React from 'react';
import { TrendingUp, Calendar, Wallet } from 'lucide-react';
import { Card } from '../ui/Card';

export interface CaisseMetricsData {
  potential: number;
  expected: number;
  collected: number;
  remaining: number;
  balance: number;
}

interface CaisseMetricsProps {
  metrics: CaisseMetricsData;
  isLoading?: boolean;
}

const MetricSkeleton = () => (
  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded-lg" />
);

export const CaisseMetrics: React.FC<CaisseMetricsProps> = ({ metrics, isLoading }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
    <Card className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 dark:from-indigo-950/20 dark:to-blue-950/20 dark:border-indigo-900/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Potentiel Mensuel</span>
        <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      {isLoading ? <MetricSkeleton /> : (
        <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-200">{metrics.potential.toLocaleString('fr-FR')} FCFA</p>
      )}
    </Card>

    <Card className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100 dark:from-blue-950/20 dark:to-sky-950/20 dark:border-blue-900/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Loyers Attendus</span>
        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      {isLoading ? <MetricSkeleton /> : (
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-200">{metrics.expected.toLocaleString('fr-FR')} FCFA</p>
      )}
    </Card>

    <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-900/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-green-800 dark:text-green-300">Encaissés Réels</span>
        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
      </div>
      {isLoading ? <MetricSkeleton /> : (
        <p className="text-2xl font-bold text-green-700 dark:text-green-200">{metrics.collected.toLocaleString('fr-FR')} FCFA</p>
      )}
    </Card>

    <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100 dark:from-orange-950/20 dark:to-amber-950/20 dark:border-orange-900/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-orange-800 dark:text-orange-300">Restes à Percevoir</span>
        <Wallet className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      </div>
      {isLoading ? <MetricSkeleton /> : (
        <p className="text-2xl font-bold text-orange-700 dark:text-orange-200">{metrics.remaining.toLocaleString('fr-FR')} FCFA</p>
      )}
    </Card>

    <Card className="p-4 col-span-2 sm:col-span-1 bg-slate-900 text-white border-slate-800 shadow-xl shadow-slate-200 dark:shadow-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">Solde de Caisse</span>
        <Wallet className="w-4 h-4 text-emerald-400" />
      </div>
      {isLoading ? <div className="h-8 w-24 bg-slate-700 animate-pulse rounded-lg" /> : (
        <p className={`text-2xl font-black ${metrics.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
          {metrics.balance.toLocaleString('fr-FR')} FCFA
        </p>
      )}
      <p className="text-xs text-slate-400 mt-1">Solde global agence</p>
    </Card>
  </div>
);
