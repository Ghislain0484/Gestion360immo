import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { clsx } from 'clsx';

export const Breadcrumbs: React.FC = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    if (pathnames.length === 0) return null;

    const routeNameMap: Record<string, string> = {
        'proprietaires': 'Propriétaires',
        'proprietes': 'Propriétés',
        'locataires': 'Locataires',
        'caisse': 'Caisse',
        'agences': 'Agences',
        'parametres': 'Paramètres',
        'dashboard': 'Tableau de bord',
    };

    return (
        <nav className="flex items-center text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
            <Link to="/dashboard" className="hover:text-blue-600 transition-colors">
                <Home className="w-4 h-4" />
            </Link>
            {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;
                const name = routeNameMap[value] || value; // Fallback to path segment if not mapped

                return (
                    <React.Fragment key={to}>
                        <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                        {isLast ? (
                            <span className="font-medium text-gray-900 capitalize" aria-current="page">
                                {name}
                            </span>
                        ) : (
                            <Link to={to} className="hover:text-blue-600 transition-colors capitalize">
                                {name}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};
