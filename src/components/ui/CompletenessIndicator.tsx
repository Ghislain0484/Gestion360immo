import React from 'react';
import { cn } from '../../utils/cn';

interface CompletenessIndicatorProps {
    percentage: number;
    color: 'red' | 'yellow' | 'green';
    message: string;
    missingFields?: string[];
    showDetails?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const CompletenessIndicator: React.FC<CompletenessIndicatorProps> = ({
    percentage,
    color,
    message,
    missingFields = [],
    showDetails = false,
    size = 'md',
}) => {
    const colorClasses = {
        red: 'bg-red-100 border-red-300 text-red-800',
        yellow: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        green: 'bg-green-100 border-green-300 text-green-800',
    };

    const progressColorClasses = {
        red: 'bg-red-500',
        yellow: 'bg-yellow-500',
        green: 'bg-green-500',
    };

    const sizeClasses = {
        sm: 'text-xs p-2',
        md: 'text-sm p-3',
        lg: 'text-base p-4',
    };

    const progressHeightClasses = {
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3',
    };

    return (
        <div className={cn('border rounded-lg', colorClasses[color], sizeClasses[size])}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <div className="font-semibold">{percentage}% complété</div>
                    {percentage === 100 && (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', progressHeightClasses[size])}>
                <div
                    className={cn('h-full transition-all duration-500 ease-out', progressColorClasses[color])}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="mt-2 text-xs">{message}</div>

            {showDetails && missingFields.length > 0 && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                    <div className="font-medium text-xs mb-1">Informations manquantes:</div>
                    <ul className="text-xs space-y-1">
                        {missingFields.slice(0, 5).map((field, index) => (
                            <li key={index} className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span>{field}</span>
                            </li>
                        ))}
                        {missingFields.length > 5 && (
                            <li className="text-xs italic">... et {missingFields.length - 5} autre(s)</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
