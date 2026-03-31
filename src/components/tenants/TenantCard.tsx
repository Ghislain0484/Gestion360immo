import React from 'react';
import { Phone, Briefcase, FileText, Home, DollarSign, Edit, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { TenantWithRental } from '../../types/db';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { clsx } from 'clsx';

interface TenantCardProps {
  tenant: TenantWithRental;
  onNavigate: () => void;
  onEdit: () => void;
  onReceipt: () => void;
  onLink: () => void;
  onFinancials: () => void;
}

const paymentConfig = {
  bon: { label: 'Bon payeur', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', gradient: 'from-emerald-500 to-teal-600' },
  irregulier: { label: 'Irrégulier', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', gradient: 'from-amber-500 to-orange-600' },
  mauvais: { label: 'Mauvais payeur', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', gradient: 'from-rose-500 to-red-600' },
};

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant, onNavigate, onEdit, onReceipt, onLink, onFinancials
}) => {
  const pCfg = paymentConfig[tenant.payment_status] ?? paymentConfig.bon;
  const fullName = `${tenant.first_name} ${tenant.last_name}`;
  const initials = `${tenant.first_name[0] ?? ''}${tenant.last_name[0] ?? ''}`.toUpperCase();
  const activeContract = tenant.active_contracts?.[0];

  return (
    <Card 
      className="p-0 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-gray-100 hover:border-primary-100" 
      onClick={onNavigate}
    >
      {/* Dynamic Gradient based on payment status */}
      <div className={clsx("relative h-20 bg-gradient-to-br", pCfg.gradient)}>
        <div className="absolute -bottom-6 left-6">
          <div className="h-16 w-16 rounded-2xl bg-white p-1 shadow-lg group-hover:scale-105 transition-transform">
            <div className={clsx("h-full w-full rounded-xl flex items-center justify-center text-white font-black text-xl bg-gradient-to-br", pCfg.gradient)}>
              {initials}
            </div>
          </div>
        </div>
        <div className="absolute top-4 right-4">
           <Badge variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-0 text-[10px] uppercase tracking-widest font-bold">
             {tenant.nationality || 'LOCATAIRE'}
           </Badge>
        </div>
      </div>

      <div className="p-4 pt-8">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
              {fullName}
            </h3>
            <p className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase tracking-wider">
              {tenant.business_id || `TEN-${tenant.id.slice(0, 8)}`}
            </p>
          </div>
          <div className={clsx("p-1.5 rounded-lg", pCfg.bg)}>
            <pCfg.icon className={clsx("h-4 w-4", pCfg.color)} />
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center text-sm text-gray-600 font-medium">
             <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center mr-3 group-hover:bg-primary-50 transition-colors">
                <Phone className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary-600" />
             </div>
             {tenant.phone}
          </div>
          <div className="flex items-center text-sm text-gray-600 font-medium">
             <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center mr-3 group-hover:bg-primary-50 transition-colors">
                <Briefcase className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary-600" />
             </div>
             <span className="truncate">{tenant.profession || 'Sans profession'}</span>
          </div>
        </div>

        {/* Rental Status */}
        <div className="mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={clsx("w-2 h-2 rounded-full", tenant.propertyId ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                {tenant.propertyId ? 'En location' : 'En attente'}
              </span>
            </div>
            {activeContract?.monthly_rent && (
              <span className="text-sm font-black text-gray-900">
                {activeContract.monthly_rent.toLocaleString('fr-FR')} <span className="text-[10px] text-gray-400">FCFA</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions Row */}
        <div className="mt-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={(e) => { e.stopPropagation(); onReceipt(); }}
             className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold"
           >
             <FileText className="w-3.5 h-3.5" /> PAYER
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onLink(); }}
             className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
             title="Lier un bien"
           >
             <Home className="w-4 h-4" />
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onFinancials(); }}
             className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white transition-all"
             title="État financier"
           >
             <DollarSign className="w-4 h-4" />
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onEdit(); }}
             className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white transition-all"
             title="Modifier"
           >
             <Edit className="w-4 h-4" />
           </button>
        </div>
      </div>
    </Card>
  );
};
