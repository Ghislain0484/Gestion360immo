import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export interface BreadcrumbItem {
    label: string;
    url?: string;
    icon?: React.ComponentType<{ className?: string }>;
}

export interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <nav aria-label="Breadcrumb" className={clsx('flex items-center gap-2 text-sm', className)}>
            <ol className="flex items-center gap-2">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const Icon = item.icon;

                    return (
                        <li key={index} className="flex items-center gap-2">
                            {item.url && !isLast ? (
                                <Link
                                    to={item.url}
                                    className="flex items-center gap-1.5 text-gray-500 hover:text-primary-600 transition-colors duration-200"
                                >
                                    {Icon && <Icon className="w-4 h-4" />}
                                    <span>{item.label}</span>
                                </Link>
                            ) : (
                                <span
                                    className={clsx(
                                        'flex items-center gap-1.5',
                                        isLast ? 'text-gray-900 font-medium' : 'text-gray-500'
                                    )}
                                >
                                    {Icon && <Icon className="w-4 h-4" />}
                                    <span>{item.label}</span>
                                </span>
                            )}

                            {!isLast && <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
