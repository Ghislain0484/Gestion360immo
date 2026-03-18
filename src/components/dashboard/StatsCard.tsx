import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface StatsCardProps {
  title: string;
  value: string | number | null | undefined;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red';
  index?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  index = 0,
}) => {
  const colorConfig = {
    blue: { bg: 'bg-blue-500', shadow: 'shadow-glow-primary', text: 'text-blue-600' },
    green: { bg: 'bg-emerald-500', shadow: 'shadow-glow-success', text: 'text-emerald-600' },
    yellow: { bg: 'bg-amber-500', shadow: 'shadow-amber-500/20', text: 'text-amber-600' },
    red: { bg: 'bg-rose-500', shadow: 'shadow-rose-500/20', text: 'text-rose-600' },
  };

  const config = colorConfig[color] || colorConfig.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="card-glass p-6 group cursor-default"
    >
      <div className="flex items-center gap-5">
        <div 
          className={clsx(
            "p-4 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500",
            config.bg,
            config.shadow
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">
            {title}
          </p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            {value ?? '0'}
          </h3>
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <div className={clsx(
            "flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full backdrop-blur-md",
            trend.isPositive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
          )}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </div>
          <span className="text-xs text-slate-400 font-medium italic">vs mois dernier</span>
        </div>
      )}

      {/* Subtle background decoration */}
      <div className={clsx(
        "absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700",
        config.bg
      )} />
    </motion.div>
  );
};