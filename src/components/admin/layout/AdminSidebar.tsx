import React from 'react';
import { BarChart3, Building2, DollarSign, Award, Settings, Home, FileText } from 'lucide-react';
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
        <aside className="w-72 bg-slate-900 border-r border-slate-800 min-h-screen sticky top-0 z-[60] flex flex-col shadow-2xl">
            {/* Sidebar Branding */}
            <div className="p-8 pb-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-indigo-500/20">
                        <div className="h-full w-full rounded-[10px] bg-slate-900 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Gestion360</h1>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Admin Console</p>
                    </div>
                </div>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const showBadge = item.badge && pendingRequestsCount > 0;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={clsx(
                                'w-full group flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden',
                                isActive
                                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 border border-indigo-500/30 shadow-indigo-500/10'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                            )}
                            <div className="flex items-center gap-3.5 relative z-10">
                                <div className={clsx(
                                    'p-2 rounded-lg transition-all duration-300',
                                    isActive
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-700/50 group-hover:text-slate-300'
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className={clsx(
                                    'tracking-wide',
                                    isActive ? 'font-semibold' : 'font-medium'
                                )}>{item.name}</span>
                            </div>
                            {showBadge && (
                                <span className="relative z-10 flex h-6 px-2 min-w-[24px] items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white ring-4 ring-slate-900">
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Platform Version Footer */}
            <div className="p-6 mt-auto">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Award className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white leading-none">Version Pro</p>
                            <p className="text-[10px] text-slate-500 mt-1">v2.0.4 stable</p>
                        </div>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-1 mt-4">
                        <div className="bg-indigo-500 h-1 rounded-full w-3/4 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
            `}</style>
        </aside>
    );
};
