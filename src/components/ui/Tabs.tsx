import React from 'react';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200',
              isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {Icon && (
              <Icon
                className={clsx(
                  'mr-2 h-5 w-5',
                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
            )}
            {tab.label}
            {tab.count !== undefined && (
              <span className={clsx(
                'ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium',
                isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-900'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
