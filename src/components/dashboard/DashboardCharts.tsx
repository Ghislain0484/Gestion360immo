import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { Card } from '../ui/Card';

interface DashboardChartsProps {
  data: {
    month: string;
    revenue: number;
    commissions: number;
  }[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data }) => {
  return (
    <Card className="p-6 border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">Performance Mensuelle</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Évolution des revenus et commissions</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-sm" />
            <span className="text-[10px] font-black text-slate-500 uppercase">Revenus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-[10px] font-black text-slate-500 uppercase">Commissions</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }}
            />
            <Tooltip 
              cursor={{ fill: '#F1F5F9' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                padding: '12px',
                backgroundColor: '#fff'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
              labelStyle={{ color: '#64748B', marginBottom: '8px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
            />
            <Bar 
                dataKey="revenue" 
                name="Revenus" 
                fill="#4F46E5" 
                radius={[6, 6, 0, 0]} 
                barSize={32}
            />
            <Bar 
                dataKey="commissions" 
                name="Commissions" 
                fill="#10B981" 
                radius={[6, 6, 0, 0]} 
                barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
