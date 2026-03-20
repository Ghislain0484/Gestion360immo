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
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { APP_NAME, IS_STANDALONE, FORCED_STANDALONE_MODULES, APP_EDITION } from '../../lib/constants';

export const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, user, agencyId, agencies, switchAgency } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAgencyMenu, setShowAgencyMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const agencyMenuRef = useRef<HTMLDivElement>(null);

  const currentAgency = agencies.find(a => a.agency_id === agencyId);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem(`theme_${user?.agency_id}`);
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem(`theme_${user?.agency_id}`, newMode ? 'dark' : 'light');
    toast.success(newMode ? '🌙 Mode sombre activé' : '☀️ Mode clair activé');
  };

  const rawModules = IS_STANDALONE 
    ? FORCED_STANDALONE_MODULES 
    : (currentAgency?.enabled_modules || ['base']);

  // Filtrage selon l'édition de l'application
  const enabledModules = rawModules.filter(mod => {
    if (APP_EDITION === 'standard' && (mod === 'hotel' || mod === 'residences')) {
      return false;
    }
    return true;
  });

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Caisse', href: '/caisse', icon: Wallet },
    { name: 'Propriétaires', href: '/proprietaires', icon: Building, module: 'base' },
    { name: 'Propriétés', href: '/proprietes', icon: Building2, module: 'base' },
    { name: 'Locataires', href: '/locataires', icon: Key, module: 'base' },
    { name: 'États des lieux', href: '/etats-des-lieux', icon: ClipboardCheck, module: 'base' },
    { name: 'Contrats', href: '/contrats', icon: FileText, module: 'base' },
    ...(enabledModules.includes('hotel') ? [{ name: 'Hôtel', href: '/hotel', icon: Building }] : []),
    ...(enabledModules.includes('residences') ? [{ name: 'Résidences', href: '/residences', icon: Building2 }] : []),
  ];

  const moreNavigation = [
    ...(enabledModules.includes('collaboration') && !enabledModules.includes('internal_mode') 
      ? [{ name: 'Collaboration', href: '/collaboration', icon: Users }] 
      : []),
    { name: 'Rapports', href: '/rapports', icon: BarChart3 },
    ...(!IS_STANDALONE ? [{ name: 'Paramètres', href: '/parametres', icon: Settings }] : [{ name: 'Application', href: '/parametres', icon: Settings }]),
  ];

  const isActiveLink = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Déconnexion réussie');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // Close menus when clicking outside
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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800 shadow-glass hidden lg:block transition-all duration-500">
      <div className="max-w-[1700px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Agency Selector */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                {currentAgency?.logo_url ? (
                  <img src={currentAgency.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Building2 className="h-6 w-6 text-white" />
                )}
              </div>
              <div className="relative" ref={agencyMenuRef}>
                <button 
                  onClick={() => agencies.length > 1 && setShowAgencyMenu(!showAgencyMenu)}
                  className={clsx(
                    "flex flex-col items-start text-left group",
                    agencies.length > 1 ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <h1 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    {IS_STANDALONE ? APP_NAME : (currentAgency?.name || APP_NAME)}
                    {agencies.length > 1 && !IS_STANDALONE && <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-primary-500 transition-colors" />}
                  </h1>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    {IS_STANDALONE ? 'Version Interne' : (currentAgency?.city || 'Immo Pro')}
                  </span>
                </button>

                {showAgencyMenu && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Mes Agences</p>
                    </div>
                    {agencies.map(ag => (
                      <button
                        key={ag.agency_id}
                        onClick={() => {
                          switchAgency(ag.agency_id);
                          setShowAgencyMenu(false);
                        }}
                        className={clsx(
                          "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors",
                          ag.agency_id === agencyId 
                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold" 
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        )}
                      >
                        <Building className="w-4 h-4" />
                        <span>{ag.name}</span>
                        {ag.agency_id === agencyId && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 dark:border-slate-700 mt-2 pt-2">
                      <button 
                        onClick={() => switchAgency(null)}
                        className="w-full px-4 py-2 text-xs text-slate-400 hover:text-slate-600 text-center italic"
                      >
                        Retour au choix de l'agence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Nav */}
            <div className="flex items-center gap-1">
              {navigation.filter(item => !item.module || enabledModules.includes(item.module)).map(item => {
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) => clsx(
                      "group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden",
                      isActive 
                        ? "bg-primary-600 text-white shadow-glow-primary translate-y-[-1px]" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <item.icon className={clsx("w-4 h-4 transition-transform group-hover:scale-110")} />
                    <span>{item.name}</span>
                    {isActiveLink(item.href) && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full mb-1" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/notifications')}
              className="p-2 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </button>

            <button 
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1 pl-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <div className="text-right hidden xl:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">
                    {user?.role || 'Agent'}
                  </p>
                </div>
                <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-md font-bold text-sm">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 mb-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  
                  {moreNavigation.map(item => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary-600 transition-colors"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </NavLink>
                  ))}

                  <div className="border-t border-gray-100 dark:border-slate-700 mt-2 pt-2">
                    <button 
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
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
