import React from 'react';
import { clsx } from 'clsx';

export interface EmptyStateProps {
    icon?: string | React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary';
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className,
}) => {
    return (
        <div
            className={clsx(
                'flex flex-col items-center justify-center py-12 px-4 text-center',
                className
            )}
        >
            {icon && (
                <div className="mb-4">
                    {typeof icon === 'string' ? (
                        <span className="text-6xl" role="img" aria-label="Empty state icon">
                            {icon}
                        </span>
                    ) : (
                        icon
                    )}
                </div>
            )}

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

            {description && (
                <p className="text-sm text-gray-500 max-w-md mb-6">{description}</p>
            )}

            {action && (
                <button
                    onClick={action.onClick}
                    className={clsx(
                        'px-4 py-2 rounded-lg font-medium transition-all duration-200',
                        action.variant === 'secondary'
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg'
                    )}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
