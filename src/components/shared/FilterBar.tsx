import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { clsx } from 'clsx';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  id: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'number';
  dateType?: 'date' | 'month';
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterBarProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (id: string, value: any) => void;
  onClear?: () => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  stats?: { 
    label: string; 
    count: string | number; 
    active: boolean; 
    onClick: () => void; 
    colorClass?: string;
    activeColorClass?: string;
  }[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  fields,
  values,
  onChange,
  onClear,
  searchTerm = "",
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  stats
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {onSearchChange !== undefined && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {fields.map((field) => (
            <div key={field.id} className="min-w-[150px]">
              {field.type === 'select' ? (
                <select
                  value={values[field.id] || 'all'}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium text-slate-700 h-[42px]"
                >
                  <option value="all">Tous {field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type === 'date' && field.dateType ? field.dateType : field.type}
                  placeholder={field.placeholder || field.label}
                  value={values[field.id] || ''}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm h-[42px]"
                />
              )}
            </div>
          ))}

          {onClear && (
            <button
              onClick={onClear}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
              title="Effacer les filtres"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            {stats.map((stat, idx) => (
              <button
                key={idx}
                onClick={stat.onClick}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  stat.active ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700",
                  stat.active ? (stat.activeColorClass || "text-blue-600") : ""
                )}
              >
                {stat.label}
                <span className={clsx(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  stat.active ? (stat.colorClass || "bg-blue-100") : "bg-slate-200"
                )}>
                  {stat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
