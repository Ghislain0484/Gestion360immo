import React from 'react';
import { MapPin, Phone, MessageCircle, Edit, Trash2 } from 'lucide-react';
import { Owner } from '../../types/db';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface OwnerCardProps {
  owner: Owner;
  stats: { total: number; occupied: number; vacant: number };
  tenantCount: number;
  onNavigate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const OwnerCard: React.FC<OwnerCardProps> = ({ 
  owner, stats, tenantCount, onNavigate, onEdit, onDelete 
}) => {
  const fullName = `${owner.first_name} ${owner.last_name}`;
  const initials = `${owner.first_name[0]}${owner.last_name[0]}`.toUpperCase();

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = owner.phone.replace(/\s+/g, '');
    window.open(`https://wa.me/${phone.startsWith('+') ? phone.slice(1) : (phone.startsWith('00') ? phone.slice(2) : `225${phone}`)}`, '_blank');
  };

  return (
    <Card className="p-0 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-gray-100 hover:border-primary-100" onClick={onNavigate}>
      {/* Header with Gradient */}
      <div className="relative h-24 bg-gradient-to-br from-primary-600 via-indigo-600 to-indigo-700">
        <div className="absolute -bottom-6 left-6">
          <div className="h-20 w-20 rounded-2xl bg-white p-1.5 shadow-lg group-hover:scale-105 transition-transform duration-300">
            <div className="h-full w-full rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
              {owner.photo_url ? (
                <img src={owner.photo_url} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-primary-600 bg-clip-text">
                  {initials}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <Badge variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-0">
             {owner.city}
           </Badge>
        </div>
      </div>

      <div className="p-6 pt-10">
        <div className="flex justify-between items-start">
          <div className="min-w-0 pr-2">
            <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-primary-600 transition-colors truncate">
              {fullName}
            </h3>
            <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-wider">
              {owner.business_id || `PROP-${owner.id.slice(0, 8)}`}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-primary-50 group-hover:border-primary-100 transition-colors">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Patrimoine</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800">{stats.total}</span>
              <span className="text-[10px] font-bold text-slate-400">biens</span>
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Locataires</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800">{tenantCount}</span>
              <span className="text-[10px] font-bold text-slate-400">actifs</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-6 space-y-2.5">
          <div className="flex items-center text-sm text-gray-600 font-medium">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center mr-3">
              <Phone className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            {owner.phone}
          </div>
          <div className="flex items-center text-sm text-gray-600 font-medium">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
            </div>
            {owner.city}
          </div>
        </div>

        {/* Improved Actions */}
        <div className="mt-8 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl border-gray-200 hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all font-bold text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
          >
            DÉTAILS
          </Button>
          <div className="flex gap-1.5">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm"
              title="WhatsApp"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
              title="Modifier"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
              title="Supprimer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};
