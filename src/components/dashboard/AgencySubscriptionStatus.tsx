import React from 'react';
import { CreditCard, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const AgencySubscriptionStatus: React.FC = () => {
  return (
    <Card className="overflow-hidden border-none bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/5 shadow-premium dark:bg-slate-900/90 dark:ring-1 dark:ring-slate-800">
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl p-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Tarification Performance (Fintech 1%)
                </h3>
                <Badge variant="success" className="bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Actif &amp; Illimité
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Votre agence bénéficie du modèle de croissance Fintech : aucuns frais fixes mensuels, accès illimité à toutes les fonctionnalités de la plateforme.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right pr-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Abonnement Fixe
              </p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                0 FCFA / mois
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/80 border border-emerald-100 text-emerald-700 text-xs font-bold shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-emerald-400">
              <Sparkles className="h-4 w-4 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
              <span>Commission Fintech active (1%)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
