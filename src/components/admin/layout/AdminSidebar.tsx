import React from 'react';
import { BarChart3, Building2, DollarSign, Award, Settings, Home, FileText, Users } from 'lucide-react';
import clsx from 'clsx';

interface AdminSidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    pendingRequestsCount?: number;
}

const menuItems = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: Home },
    { id: 'agencies', name: 'Agences', icon: Building2 },
    { id: 'subscriptions', name: 'Abonnements', icon: DollarSign },
    { id: 'requests', name: 'Demandes', icon: FileText, badge: true },
    { id: 'rankings', name: 'Classements', icon: Award },
    { id: 'reports', name: 'Rapports', icon: BarChart3 },
    { id: 'settings', name: 'Paramètres', icon: Settings },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
    activeTab,
    onTabChange,
    pendingRequestsCount = 0,
}) => {
    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen sticky top-16">
            <nav className="p-4 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const showBadge = item.badge && pendingRequestsCount > 0;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={clsx(
                                'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all',
                                isActive
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200'
                                    : 'text-gray-700 hover:bg-gray-100'
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={clsx('h-5 w-5', isActive ? 'text-white' : 'text-gray-500')} />
                                <span>{item.name}</span>
                            </div>
                            {showBadge && (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer sidebar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="text-center">
                    <p className="text-xs font-semibold text-indigo-900">Gestion360Immo</p>
                    <p className="text-xs text-indigo-600">Admin v2.0</p>
                </div>
            </div>
        </aside>
    );
};
