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
    <Card className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-indigo-800">Potentiel Mensuel</span>
        <TrendingUp className="w-4 h-4 text-indigo-600" />
      </div>
      {isLoading ? <MetricSkeleton /> : (
        <p className="text-2xl font-bold text-indigo-700">{metrics.potential.toLocaleString('fr-FR')} FCFA</p>
      )}
    </Card>

    <Card className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-800">Loyers Attendus</span>
        <Calendar className="w-4 h-4 text-blue-600" />
      </div>
      {isLoading ? <MetricSkeleton /> : (
        <p className="text-2xl font-bold text-blue-700">{metrics.expected.toLocaleString('fr-FR')} FCFA</p>
      )}
    </Card>

    <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-green-800">Encaissés Réels</span>
        <TrendingUp className="w-4 h-4 text-green-600" />
      </div>
      {isLoading ? <MetricSkeleton /> : (
        <p className="text-2xl font-bold text-green-700">{metrics.collected.toLocaleString('fr-FR')} FCFA</p>
      )}
    </Card>

    <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-orange-800">Restes à Percevoir</span>
        <Wallet className="w-4 h-4 text-orange-600" />
      </div>
      {isLoading ? <MetricSkeleton /> : (
        <p className="text-2xl font-bold text-orange-700">{metrics.remaining.toLocaleString('fr-FR')} FCFA</p>
      )}
    </Card>

    <Card className="p-4 col-span-2 sm:col-span-1 bg-slate-900 text-white border-slate-800 shadow-xl shadow-slate-200">
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
