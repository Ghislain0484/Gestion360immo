import React from 'react';
import { clsx } from 'clsx';

export interface StatusBadgeProps {
    status: 'occupe' | 'vacant' | 'travaux' | 'paye' | 'impaye' | 'retard' | 'partiel' | 'actif' | 'inactif' | 'termine';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const STATUS_CONFIG = {
    // Property statuses
    occupe: {
        label: 'Occupé',
        icon: '🟢',
        bgColor: 'bg-success-50',
        textColor: 'text-success-700',
        borderColor: 'border-success-200',
    },
    vacant: {
        label: 'Vacant',
        icon: '🔴',
        bgColor: 'bg-danger-50',
        textColor: 'text-danger-700',
        borderColor: 'border-danger-200',
    },
    travaux: {
        label: 'Travaux',
        icon: '🟠',
        bgColor: 'bg-warning-50',
        textColor: 'text-warning-700',
        borderColor: 'border-warning-200',
    },
    // Payment statuses
    paye: {
        label: 'Payé',
        icon: '✅',
        bgColor: 'bg-success-50',
        textColor: 'text-success-700',
        borderColor: 'border-success-200',
    },
    impaye: {
        label: 'Impayé',
        icon: '❌',
        bgColor: 'bg-danger-50',
        textColor: 'text-danger-700',
        borderColor: 'border-danger-200',
    },
    retard: {
        label: 'En retard',
        icon: '⚠️',
        bgColor: 'bg-warning-50',
        textColor: 'text-warning-700',
        borderColor: 'border-warning-200',
    },
    partiel: {
        label: 'Partiel',
        icon: '⏳',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
    },
    // General statuses
    actif: {
        label: 'Actif',
        icon: '✓',
        bgColor: 'bg-success-50',
        textColor: 'text-success-700',
        borderColor: 'border-success-200',
    },
    inactif: {
        label: 'Inactif',
        icon: '○',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
    },
    termine: {
        label: 'Terminé',
        icon: '✓',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
    },
};

const SIZE_CONFIG = {
    sm: {
        padding: 'px-2 py-0.5',
        text: 'text-2xs',
        iconSize: 'text-xs',
    },
    md: {
        padding: 'px-2.5 py-1',
        text: 'text-xs',
        iconSize: 'text-sm',
    },
    lg: {
        padding: 'px-3 py-1.5',
        text: 'text-sm',
        iconSize: 'text-base',
    },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    size = 'md',
    className,
}) => {
    const config = STATUS_CONFIG[status];
    const sizeConfig = SIZE_CONFIG[size];

    if (!config) {
        console.warn(`Unknown status: ${status}`);
        return null;
    }

    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 rounded-full border font-medium transition-all duration-200',
                config.bgColor,
                config.textColor,
                config.borderColor,
                sizeConfig.padding,
                sizeConfig.text,
                className
            )}
        >
            <span className={sizeConfig.iconSize}>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    );
};

export default StatusBadge;
