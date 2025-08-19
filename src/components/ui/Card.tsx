// src/components/ui/Card.tsx
import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  } as const;

  return (
    <div
      className={cn(
        'bg-white/90 backdrop-blur-sm rounded-xl shadow-soft border border-white/20 card-hover animate-fade-in-up',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};
