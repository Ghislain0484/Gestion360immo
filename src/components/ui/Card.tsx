import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  role?: string; // Optional role for accessibility
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className,
  padding = 'md' 
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={cn(
      'bg-white/90 backdrop-blur-sm rounded-xl shadow-soft border border-white/20 card-hover animate-fade-in-up',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
};