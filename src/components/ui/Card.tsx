import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'hover';
  role?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  variant = 'default',
  ...props
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantClasses = {
    default: 'bg-white dark:bg-slate-800 shadow-elegant border border-gray-100 dark:border-slate-600',
    glass: 'card-glass',
    hover: 'bg-white dark:bg-slate-800 shadow-elegant border border-gray-100 dark:border-slate-600 card-hover',
  };

  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-300 animate-fade-in-up',
        variantClasses[variant],
        props.onClick && 'cursor-pointer interactive-scale',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};