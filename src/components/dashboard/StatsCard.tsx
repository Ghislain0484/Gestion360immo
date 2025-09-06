import React, { useMemo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
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
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
}) => {
  const validColors = ['blue', 'green', 'yellow', 'red'] as const;
  if (!validColors.includes(color)) {
    console.warn(`Invalid color "${color}" provided to StatsCard. Using default "blue".`);
  }

  const colorClasses = useMemo(() => ({
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }), []);

  const formattedValue = value ?? 'N/A';

  return (
    <Card
      className="relative overflow-hidden hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
      role="region"
      aria-label={`Carte de statistique: ${title}`}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div
            className={clsx(
              'inline-flex items-center justify-center p-3 rounded-xl shadow-lg',
              colorClasses[color] || colorClasses.blue
            )}
            aria-hidden="true"
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-lg font-semibold text-gray-900">
              {formattedValue}
            </dd>
          </dl>
        </div>
      </div>

      {trend && (
        <div className="mt-4" aria-describedby={`trend-${title}`}>
          <div className="flex items-center text-sm">
            <span
              className={clsx(
                'flex items-center',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
            </span>
            <span className="ml-2 text-gray-500">vs mois précédent</span>
          </div>
        </div>
      )}
    </Card>
  );
};