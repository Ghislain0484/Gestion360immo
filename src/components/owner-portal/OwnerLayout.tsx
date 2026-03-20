import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Building2, Key, Wallet, ClipboardCheck, 
  Menu, Bell, LogOut, X, User 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import { APP_NAME } from '../../lib/constants';

export const OwnerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { owner, logout } = useAuth();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Tableau de bord', href: '/espace-proprietaire', icon: LayoutDashboard },
    { name: 'Mes Biens', href: '/espace-proprietaire/proprietes', icon: Building2 },
    { name: 'Mes Locataires', href: '/espace-proprietaire/locataires', icon: Key },
    { name: 'Finances', href: '/espace-proprietaire/finances', icon: Wallet },
    { name: 'Travaux & États des lieux', href: '/espace-proprietaire/travaux', icon: ClipboardCheck },
  ];

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const isActiveLink = (path: string) => {
    if (path === '/espace-proprietaire' && location.pathname !== '/espace-proprietaire') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-mesh font-sans text-gray-900 dark:text-slate-100 transition-colors duration-500 overflow-x-hidden">
      {/* Mobile background overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-emerald-900 to-emerald-950 text-white transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-6 py-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none text-white">
                {APP_NAME}
              </h1>
              <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mt-1">
                Espace Propriétaire
              </p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-emerald-400 hover:text-white rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActiveLink(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-emerald-800/80 text-white shadow-lg shadow-emerald-900/50"
                    : "text-emerald-100/70 hover:bg-emerald-800/40 hover:text-white"
                )}
              >
                <item.icon className={clsx("w-5 h-5", active ? "text-emerald-300" : "text-emerald-400/70")} />
                <span>{item.name}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 bg-emerald-950/50 border-t border-emerald-800/50">
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center font-bold text-emerald-200">
              {owner?.first_name?.[0]}{owner?.last_name?.[0]}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-white truncate">{owner?.first_name} {owner?.last_name}</p>
              <p className="text-xs text-emerald-400 truncate">{owner?.email || 'Propriétaire'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      <div className="lg:pl-72 transition-all duration-300 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-[1700px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};
