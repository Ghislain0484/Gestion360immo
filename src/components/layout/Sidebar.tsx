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
import { APP_NAME, IS_STANDALONE, FORCED_STANDALONE_MODULES } from '../../lib/constants';

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
    { name: 'Propriétaires', href: '/proprietaires', icon: Building, module: 'base' },
    { name: 'Propriétés', href: '/proprietes', icon: Building2, module: 'base' },
    { name: 'Locataires', href: '/locataires', icon: Key, module: 'base' },
    { name: 'États des lieux', href: '/etats-des-lieux', icon: ClipboardCheck, module: 'base' },
    { name: 'Travaux', href: '/travaux', icon: LayoutDashboard, module: 'base' },
  ];

  const secondaryNavigation = [
    { name: 'Contrats', href: '/contrats', icon: FileText, module: 'base' },
    { 
      name: 'G. Hôtelière', 
      href: '/hotel', 
      icon: Building, 
      module: 'hotel' 
    },
    { 
      name: 'Résidences', 
      href: '/residences', 
      icon: Building2, 
      module: 'residences' 
    },
    { name: 'Collaboration', href: '/collaboration', icon: Users, module: 'collaboration' },
    { name: 'Rapports', href: '/rapports', icon: BarChart3 },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { 
      name: IS_STANDALONE ? 'Application' : 'Paramètres', 
      href: '/parametres', 
      icon: Settings 
    },
  ];

  const enabledModules = IS_STANDALONE 
    ? FORCED_STANDALONE_MODULES 
    : (currentAgency?.enabled_modules || ['base']);
  
  const filteredSecondaryNav = secondaryNavigation.filter(item => 
    !item.module || 
    enabledModules.includes(item.module) || 
    (item.module === 'collaboration' && !enabledModules.includes('internal_mode'))
  );

  const isActiveLink = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  const filteredNavigation = navigation.filter(item => 
    !item.module || enabledModules.includes(item.module)
  );

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
          "fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-white via-gray-50 to-gray-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 border-r border-gray-200 dark:border-slate-600 transform transition-all duration-300 ease-out shadow-2xl flex flex-col lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo and Agency Selector */}
        <div className="flex flex-col px-6 pt-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-primary-400 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
                <div className="relative w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-600 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                  {currentAgency?.logo_url ? (
                    <img
                      src={currentAgency.logo_url}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight leading-none">
                  {APP_NAME}
                </h1>
                <p className="text-[10px] uppercase font-bold text-primary-600/80 dark:text-primary-400/80 tracking-widest mt-1">
                  {IS_STANDALONE ? 'Version Interne' : 'Gestion Immobilière'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {!IS_STANDALONE && agencies.length > 1 && (
            <button
              onClick={() => switchAgency(null)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100/50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              <span className="truncate">{currentAgency?.name || 'Changer d\'agence'}</span>
              <Users size={12} className="ml-2 shrink-0" />
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            {filteredNavigation.map((item) => {
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
            {filteredSecondaryNav.map((item) => {
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
