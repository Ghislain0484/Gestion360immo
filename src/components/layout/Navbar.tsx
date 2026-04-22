import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Key,
  Wallet,
  Settings,
  Building,
  LogOut,
  Users,
  BarChart3,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  ClipboardCheck,
  FileText,
  Zap,
  ZapOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoContext';
import { useTheme } from '../../contexts/ThemeContext';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { APP_NAME, IS_STANDALONE, FORCED_STANDALONE_MODULES, APP_EDITION } from '../../lib/constants';

export const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, user, agencyId, agencies, switchAgency } = useAuth();
  const { isDemoMode, isDemoUser, toggleDemoMode } = useDemoMode();
  const { theme, setTheme, isDark } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAgencyMenu, setShowAgencyMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const agencyMenuRef = useRef<HTMLDivElement>(null);

  const currentAgency = agencies.find((agency) => agency.agency_id === agencyId);

  const toggleDarkMode = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(newTheme === 'dark' ? 'Mode sombre active' : 'Mode clair active');
  };

  const rawModules = IS_STANDALONE
    ? FORCED_STANDALONE_MODULES
    : (currentAgency?.enabled_modules || ['base']);

  const enabledModules = rawModules.filter((mod) => {
    if (APP_EDITION === 'standard' && (mod === 'hotel' || mod === 'residences')) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    console.log('Navbar: currentAgency:', currentAgency?.name, 'enabledModules:', enabledModules);
  }, [currentAgency, enabledModules]);

  const checkModule = (mod?: string) => {
    if (!mod) return true;
    if (IS_STANDALONE) return true;
    if (enabledModules.includes(mod)) return true;

    if (enabledModules.includes('base')) {
      const coreModules = ['dashboard', 'properties', 'owners', 'tenants', 'contracts', 'caisse', 'etats-des-lieux', 'travaux', 'documents'];
      return coreModules.includes(mod);
    }

    return false;
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Caisse', href: '/caisse', icon: Wallet, module: 'caisse' },
    { name: 'Proprietaires', href: '/proprietaires', icon: Building, module: 'owners' },
    { name: 'Proprietes', href: '/proprietes', icon: Building2, module: 'properties' },
    { name: 'Locataires', href: '/locataires', icon: Key, module: 'tenants' },
    { name: 'Etats des lieux', href: '/etats-des-lieux', icon: ClipboardCheck, module: 'etats-des-lieux' },
    { name: 'Contrats', href: '/contrats', icon: FileText, module: 'contracts' },
    ...(checkModule('hotel') ? [{ name: 'Hotel', href: '/hotel', icon: Building }] : []),
    ...(checkModule('residences') ? [{ name: 'Residences', href: '/residences', icon: Building2 }] : []),
    ...(checkModule('travaux') ? [{ name: 'Travaux', href: '/travaux', icon: Settings }] : []),
  ];

  const moreNavigation = [
    ...(checkModule('collaboration') && !checkModule('internal_mode')
      ? [{ name: 'Collaboration', href: '/collaboration', icon: Users }]
      : []),
    { name: 'Rapports', href: '/rapports', icon: BarChart3 },
    ...(!IS_STANDALONE
      ? [{ name: 'Parametres', href: '/parametres', icon: Settings }]
      : [{ name: 'Application', href: '/parametres', icon: Settings }]),
  ];

  const isActiveLink = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Deconnexion reussie');
    } catch {
      toast.error('Erreur lors de la deconnexion');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (agencyMenuRef.current && !agencyMenuRef.current.contains(event.target as Node)) {
        setShowAgencyMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 hidden border-b border-gray-200 bg-white/80 backdrop-blur-xl shadow-glass transition-all duration-500 dark:border-slate-800 dark:bg-slate-900/80 lg:block">
      <div className="mx-auto max-w-[1700px] px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-500/20">
                {currentAgency?.logo_url ? (
                  <img src={currentAgency.logo_url} alt="Logo" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <Building2 className="h-6 w-6 text-white" />
                )}
              </div>

              <div className="relative" ref={agencyMenuRef}>
                <button
                  onClick={() => agencies.length > 1 && setShowAgencyMenu(!showAgencyMenu)}
                  className={clsx(
                    'flex flex-col items-start text-left group',
                    agencies.length > 1 ? 'cursor-pointer' : 'cursor-default'
                  )}
                >
                  <h1 className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-white">
                    {IS_STANDALONE ? APP_NAME : (currentAgency?.name || APP_NAME)}
                    {agencies.length > 1 && !IS_STANDALONE && (
                      <ChevronDown className="h-3 w-3 text-slate-400 transition-colors group-hover:text-primary-500" />
                    )}
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {IS_STANDALONE ? 'Version Interne' : (currentAgency?.city || 'Immo Pro')}
                  </span>
                </button>

                {showAgencyMenu && (
                  <div className="absolute top-full left-0 mt-2 w-64 animate-in rounded-xl border border-gray-100 bg-white py-2 shadow-xl slide-in-from-top-2 fade-in dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-2 border-b border-gray-100 px-4 py-2 dark:border-slate-700">
                      <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">Mes Agences</p>
                    </div>
                    {agencies.map((agency) => (
                      <button
                        key={agency.agency_id}
                        onClick={() => {
                          switchAgency(agency.agency_id);
                          setShowAgencyMenu(false);
                        }}
                        className={clsx(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                          agency.agency_id === agencyId
                            ? 'bg-primary-50 font-bold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/50'
                        )}
                      >
                        <Building className="h-4 w-4" />
                        <span>{agency.name}</span>
                        {agency.agency_id === agencyId && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />}
                      </button>
                    ))}
                    <div className="mt-2 border-t border-gray-100 pt-2 dark:border-slate-700">
                      <button
                        onClick={() => switchAgency(null)}
                        className="w-full px-4 py-2 text-center text-xs italic text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        Retour au choix de l'agence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {navigation.filter((item) => !item.module || checkModule(item.module)).map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) => clsx(
                    'group relative flex items-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-bold transition-all duration-300',
                    isActive
                      ? 'translate-y-[-1px] bg-primary-600 text-white shadow-glow-primary'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>{item.name}</span>
                  {isActiveLink(item.href) && (
                    <span className="absolute bottom-0 left-1/2 mb-1 h-1 w-1 -translate-x-1/2 rounded-full bg-white" />
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/notifications')}
              className="relative rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-50 hover:text-primary-600 dark:hover:bg-slate-800 dark:hover:text-primary-400"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            <button
              onClick={toggleDarkMode}
              className="rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-50 hover:text-primary-600 dark:hover:bg-slate-800 dark:hover:text-primary-400"
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isDemoUser && (
              <button
                onClick={() => {
                  toggleDemoMode();
                  toast.success(!isDemoMode ? 'Mode demo active (donnees fictives)' : 'Retour au mode reel');
                }}
                className={clsx(
                  'flex items-center gap-2 rounded-lg p-2 transition-all',
                  isDemoMode
                    ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-500/20 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'text-slate-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/10'
                )}
                title="Activer le mode presentation (donnees fictives)"
              >
                {isDemoMode ? <Zap className="h-5 w-5 animate-pulse" /> : <ZapOff className="h-5 w-5" />}
              </button>
            )}

            <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 rounded-full border border-transparent p-1 pl-3 transition-all hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              >
                <div className="hidden text-right xl:block">
                  <p className="text-xs font-bold leading-none text-slate-900 dark:text-white">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                    {user?.role || 'Agent'}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 text-sm font-bold text-white shadow-md">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-2 w-64 animate-in rounded-xl border border-gray-100 bg-white py-2 shadow-xl slide-in-from-top-2 fade-in dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-2 border-b border-gray-100 px-4 py-3 dark:border-slate-700">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.first_name} {user?.last_name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>

                  {moreNavigation.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-slate-700/50"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </NavLink>
                  ))}

                  <div className="mt-2 border-t border-gray-100 pt-2 dark:border-slate-700">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      Deconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
