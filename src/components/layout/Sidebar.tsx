import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Key,
  Wallet,
  Settings,
  Building,
  LogOut,
  X,
  Users,
  FileText,
  BarChart3,
  Bell,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { pathname } = useLocation();
  const { logout, user, agencyId, agencies, switchAgency } = useAuth();

  const currentAgency = agencies.find(a => a.agency_id === agencyId);
  console.log('🐞 Sidebar: user role:', user?.role, 'agencies count:', agencies.length, 'agencyId:', agencyId);

  // Updated navigation structure matching redesign
  const navigation = [
    { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
    { name: 'Caisse', href: '/caisse', icon: Wallet },
    { name: 'Propriétaires', href: '/proprietaires', icon: Building },
    { name: 'Propriétés', href: '/proprietes', icon: Building2 },
    { name: 'Locataires', href: '/locataires', icon: Key },
    { name: 'États des lieux', href: '/etats-des-lieux', icon: ClipboardCheck },
    { name: 'Travaux', href: '/travaux', icon: LayoutDashboard },
  ];

  const secondaryNavigation = [
    { name: 'Contrats', href: '/contrats', icon: FileText },
    { name: 'Collaboration', href: '/collaboration', icon: Users },
    { name: 'Rapports', href: '/rapports', icon: BarChart3 },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Paramètres', href: '/parametres', icon: Settings },
  ];

  const isActiveLink = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-white via-gray-50 to-gray-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 border-r border-gray-200 dark:border-slate-600 transform transition-all duration-300 ease-out lg:translate-x-0 shadow-2xl lg:shadow-none flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8 px-6 pt-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-primary-400 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
            <div className="relative w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-600 group-hover:scale-110 transition-transform duration-300">
              <Building2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {agencies.length > 1 ? (
              <button
                onClick={() => switchAgency(null)}
                className="group flex flex-col items-start w-full text-left hover:bg-white/10 p-1 -m-1 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700 shadow-none hover:shadow-sm"
                title="Changer d'agence active"
              >
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent dark:from-primary-400 dark:to-primary-300 leading-tight flex items-center gap-2">
                  Gestion360 {currentAgency && `- ${currentAgency.name}`}
                  <span className="text-[10px] items-center gap-1 text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full hidden group-hover:flex">
                    Changer
                  </span>
                </h1>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  {currentAgency ? currentAgency.city : 'CHOISIR UNE AGENCE'}
                </p>
              </button>
            ) : (
              <>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent dark:from-primary-400 dark:to-primary-300 leading-tight">
                  Gestion360 {currentAgency && `- ${currentAgency.name}`}
                </h1>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  {currentAgency ? currentAgency.city : 'IMMO PRO'}
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800/50 transition-all duration-200 hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            {navigation.map((item) => {
              const active = isActiveLink(item.href);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => onClose()}
                  className={clsx(
                    "group flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 mb-1 hover:scale-[1.02]",
                    active
                      ? "bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/20 dark:shadow-primary-500/30"
                      : "text-gray-700 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <item.icon className={clsx(
                    "w-5 h-5 transition-transform duration-200",
                    active ? "text-white scale-110" : "text-gray-600 dark:text-slate-500 group-hover:text-gray-900 dark:group-hover:text-white group-hover:scale-105"
                  )} />
                  <span>{item.name}</span>
                  {active && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm animate-pulse" />
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-slate-800/50 my-4" />

          {/* Secondary Navigation */}
          <div>
            {secondaryNavigation.map((item) => {
              const active = isActiveLink(item.href);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => onClose()}
                  className={clsx(
                    "flex items-center space-x-3 px-6 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden",
                    active
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm"
                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-primary-600 dark:hover:text-primary-400 hover:scale-[1.02]"
                  )}
                >
                  <item.icon className={clsx(
                    "w-5 h-5 transition-colors duration-200",
                    active ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-slate-500 group-hover:text-gray-900 dark:group-hover:text-white"
                  )} />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div className="mt-auto border-t border-gray-200 dark:border-slate-700 p-4 bg-gradient-to-t from-gray-50 dark:from-slate-900 to-transparent">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-600 hover:shadow-md transition-all duration-200">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-200 dark:ring-primary-700"
              />
            ) : (
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center ring-2 ring-primary-200 dark:ring-primary-700">
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-300">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-300 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 mt-3 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-danger-600 dark:hover:text-white hover:bg-danger-50 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-200 group hover:scale-[1.02]"
          >
            <LogOut className="w-5 h-5 text-gray-500 dark:text-slate-500 group-hover:text-danger-500 dark:group-hover:text-danger-400 transition-colors" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
