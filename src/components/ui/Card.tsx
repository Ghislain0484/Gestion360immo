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
    default: 'bg-white/80 backdrop-blur-md dark:bg-slate-800/80 shadow-elegant border border-slate-100 dark:border-slate-700',
    glass: 'card-glass',
    hover: 'bg-white/80 backdrop-blur-md dark:bg-slate-800/80 shadow-elegant border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1',
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