import React from 'react';
import { LineChart, TrendingUp, Wallet, Info, AlertTriangle, Building } from 'lucide-react';
import { Property, Contract } from '../../types/db';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface OwnerPortfolioInsightsProps {
  properties: Property[];
  contracts: Contract[];
}

export const OwnerPortfolioInsights: React.FC<OwnerPortfolioInsightsProps> = ({ properties, contracts }) => {
  // Constants for Côte d'Ivoire market (Abidjan)
  const DEFAULT_YIELD = 0.10; // 10% yield
  const MORTGAGE_RATIO = 0.65; // 65% of valuation

  const stats = React.useMemo(() => {
    let totalValuation = 0;
    let annualGrossRent = 0;
    let totalOccupied = 0;

    properties.forEach(p => {
      // 1. Valuation logic
      // Priority: sale_price > (annual rent / yield) > 0
      let valuation = 0;
      if (p.sale_price && p.sale_price > 0) {
        valuation = p.sale_price;
      } else if (p.monthly_rent && p.monthly_rent > 0) {
        valuation = (p.monthly_rent * 12) / DEFAULT_YIELD;
      }
      totalValuation += valuation;

      // 2. Rent logic
      const activeContract = contracts.find(c => 
        c.property_id === p.id && c.status === 'active' && c.type === 'location'
      );
      if (activeContract) {
        annualGrossRent += (activeContract.monthly_rent || 0) * 12;
        totalOccupied += 1;
      }
    });

    return {
      totalValuation,
      annualGrossRent,
      occupancyRate: properties.length > 0 ? (totalOccupied / properties.length) * 100 : 0,
      mortgageCapacity: totalValuation * MORTGAGE_RATIO,
      averageYield: totalValuation > 0 ? (annualGrossRent / totalValuation) * 100 : 0
    };
  }, [properties, contracts]);

  const formatCurrency = (amt: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amt);

  return (
    <div className="space-y-8">
      {/* Portfolio Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LineChart className="w-6 h-6 text-indigo-600" />
            Valorisation du Patrimoine
          </h3>
          <p className="text-sm text-gray-500">Expertise financière et perspectives d'investissement</p>
        </div>
        <Badge variant="info" className="px-3 py-1 flex items-center gap-1">
          <Info className="w-3 h-3" /> Marché Abidjan (CI) - Rendement estimé 10%
        </Badge>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Building className="w-24 h-24" />
          </div>
          <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">Valeur Estimée du Parc</p>
          <div className="text-3xl font-black">{formatCurrency(stats.totalValuation)}</div>
          <div className="mt-4 text-[10px] text-indigo-100 leading-tight">
            Base : Prix de vente déclaré ou <br />capitalisation des loyers (Yield 10%)
          </div>
        </Card>

        <Card className="bg-white border-slate-100 shadow-lg p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-emerald-600">
            <TrendingUp className="w-24 h-24" />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Revenu Brut Annuel</p>
          <div className="text-3xl font-black text-slate-900">{formatCurrency(stats.annualGrossRent)}</div>
          <div className="mt-4 flex items-center text-xs text-emerald-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            Rentabilité : {stats.averageYield.toFixed(2)}%
          </div>
        </Card>

        <Card className="bg-white border-slate-100 shadow-lg p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-amber-600">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Capacité d'Hypothèque (65%)</p>
          <div className="text-3xl font-black text-slate-900">{formatCurrency(stats.mortgageCapacity)}</div>
          <div className="mt-4 text-[10px] text-amber-600 font-semibold leading-tight flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Potentiel de prêt pour investissement
          </div>
        </Card>
      </div>

      {/* Advisory Section */}
      <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
        <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5" /> Conseil de l'Expert Visionnaire
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
              <h5 className="text-sm font-bold text-indigo-700 mb-1">Optimisation du Rendement</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Votre taux d'occupation actuel est de <strong>{stats.occupancyRate.toFixed(0)}%</strong>. 
                {stats.occupancyRate < 90 ? " Il y a un potentiel d'augmentation de vos revenus en réduisant la vacance locative." : " Votre parc est excellemment géré, vous pouvez envisager une légère réévaluation des loyers au terme des bails."}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
              <h5 className="text-sm font-bold text-indigo-700 mb-1">Stratégie Patrimoniale</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Avec une valeur de <strong>{formatCurrency(stats.totalValuation)}</strong>, vous disposez d'un levier solide pour acquérir de nouvelles unités. 
                Une hypothèque de <strong>{formatCurrency(stats.mortgageCapacity)}</strong> pourrait financer jusqu'à 3 nouveaux appartements standing à Abidjan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning/Disclaimer */}
      <p className="text-[10px] text-gray-400 text-center italic">
        * Cette estimation est fournie à titre indicatif selon les standards du marché immobilier d'Abidjan (CI). 
        Elle ne remplace pas une expertise agréée par un notaire ou un cabinet spécialisé.
      </p>
    </div>
  );
};
