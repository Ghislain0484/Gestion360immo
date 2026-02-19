import React from 'react';
import { clsx } from 'clsx';

export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'spinner' | 'dots' | 'pulse';
    color?: 'primary' | 'white' | 'gray';
    className?: string;
    label?: string;
}

const SIZE_CONFIG = {
    sm: { spinner: 'w-4 h-4', dot: 'w-1.5 h-1.5', pulse: 'w-8 h-8' },
    md: { spinner: 'w-6 h-6', dot: 'w-2 h-2', pulse: 'w-12 h-12' },
    lg: { spinner: 'w-8 h-8', dot: 'w-2.5 h-2.5', pulse: 'w-16 h-16' },
    xl: { spinner: 'w-12 h-12', dot: 'w-3 h-3', pulse: 'w-20 h-20' },
};

const COLOR_CONFIG = {
    primary: 'border-primary-600 text-primary-600',
    white: 'border-white text-white',
    gray: 'border-gray-600 text-gray-600',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    variant = 'spinner',
    color = 'primary',
    className,
    label,
}) => {
    const sizeConfig = SIZE_CONFIG[size];
    const colorClass = COLOR_CONFIG[color];

    if (variant === 'spinner') {
        return (
            <div className={clsx('flex flex-col items-center gap-2', className)}>
                <div
                    className={clsx(
                        'animate-spin rounded-full border-2 border-t-transparent',
                        sizeConfig.spinner,
                        colorClass
                    )}
                    role="status"
                    aria-label={label || 'Chargement en cours'}
                />
                {label && (
                    <span className={clsx('text-sm font-medium', color === 'white' ? 'text-white' : 'text-gray-600')}>
                        {label}
                    </span>
                )}
            </div>
        );
    }

    if (variant === 'dots') {
        return (
            <div className={clsx('flex flex-col items-center gap-2', className)}>
                <div className="flex items-center gap-1.5" role="status" aria-label={label || 'Chargement en cours'}>
                    <div
                        className={clsx(
                            'rounded-full animate-bounce',
                            sizeConfig.dot,
                            color === 'primary' ? 'bg-primary-600' : color === 'white' ? 'bg-white' : 'bg-gray-600'
                        )}
                        style={{ animationDelay: '0ms' }}
                    />
                    <div
                        className={clsx(
                            'rounded-full animate-bounce',
                            sizeConfig.dot,
                            color === 'primary' ? 'bg-primary-600' : color === 'white' ? 'bg-white' : 'bg-gray-600'
                        )}
                        style={{ animationDelay: '150ms' }}
                    />
                    <div
                        className={clsx(
                            'rounded-full animate-bounce',
                            sizeConfig.dot,
                            color === 'primary' ? 'bg-primary-600' : color === 'white' ? 'bg-white' : 'bg-gray-600'
                        )}
                        style={{ animationDelay: '300ms' }}
                    />
                </div>
                {label && (
                    <span className={clsx('text-sm font-medium', color === 'white' ? 'text-white' : 'text-gray-600')}>
                        {label}
                    </span>
                )}
            </div>
        );
    }

    if (variant === 'pulse') {
        return (
            <div className={clsx('flex flex-col items-center gap-2', className)}>
                <div
                    className={clsx(
                        'rounded-full animate-pulse-slow',
                        sizeConfig.pulse,
                        color === 'primary' ? 'bg-primary-200' : color === 'white' ? 'bg-white/30' : 'bg-gray-200'
                    )}
                    role="status"
                    aria-label={label || 'Chargement en cours'}
                />
                {label && (
                    <span className={clsx('text-sm font-medium', color === 'white' ? 'text-white' : 'text-gray-600')}>
                        {label}
                    </span>
                )}
            </div>
        );
    }

    return null;
};

export default LoadingSpinner;
