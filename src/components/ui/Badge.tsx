import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'sm',
  className,
}) => {
  const variants = {
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200',
    success: 'bg-green-100 text-green-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium',
      variants[variant],
      sizes[size],
      className
    )}>
      {children}
    </span>
  );
};
