import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/Card';
import { useTheme } from '../../contexts/ThemeContext';

interface DashboardChartsProps {
  data: {
    month: string;
    revenue: number;
    commissions: number;
  }[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data }) => {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#334155' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipBackground = isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
  const tooltipText = isDark ? '#E2E8F0' : '#0F172A';
  const cursorFill = isDark ? 'rgba(51, 65, 85, 0.35)' : '#F1F5F9';

  return (
    <Card className="overflow-hidden border border-slate-200/70 bg-white/90 p-6 shadow-premium dark:border-slate-700/70 dark:bg-slate-900/80">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-wider text-slate-800 dark:text-white">
            Performance mensuelle
          </h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Evolution des revenus et commissions
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-indigo-600 shadow-sm" />
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">Revenus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">Commissions</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: tickColor, fontSize: 10, fontWeight: 800 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: tickColor, fontSize: 10, fontWeight: 800 }}
            />
            <Tooltip
              cursor={{ fill: cursorFill }}
              contentStyle={{
                borderRadius: '16px',
                border: `1px solid ${tooltipBorder}`,
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.18), 0 8px 10px -6px rgb(0 0 0 / 0.18)',
                padding: '12px',
                backgroundColor: tooltipBackground,
              }}
              itemStyle={{
                fontSize: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: tooltipText,
              }}
              labelStyle={{
                color: tickColor,
                marginBottom: '8px',
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
              }}
            />
            <Bar dataKey="revenue" name="Revenus" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={32} />
            <Bar dataKey="commissions" name="Commissions" fill="#10B981" radius={[6, 6, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
