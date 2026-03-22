import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Building2, Key, Wallet, ClipboardCheck, 
  Menu, Bell, LogOut, X, User, ChevronRight, Settings,
  Database, Info, AlertCircle, FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { clsx } from 'clsx';
import { APP_NAME } from '../../lib/constants';

export const OwnerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const location = useLocation();
  const { owner, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (owner?.id) {
       // Check data link in background for diagnostics
       supabase.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', owner.id)
       .then(({ count }) => setPropertyCount(count));
    }
  }, [owner?.id]);

  const navigation = [
    { name: 'Dashboard', href: '/espace-proprietaire', icon: LayoutDashboard },
    { name: 'Mon Parc Immobilier', href: '/espace-proprietaire/proprietes', icon: Building2 },
    { name: 'Mes Locataires', href: '/espace-proprietaire/locataires', icon: Key },
    { name: 'États Financiers', href: '/espace-proprietaire/finances', icon: Wallet },
    { name: 'Documents', href: '/espace-proprietaire/documents', icon: FileText },
    { name: 'Maintenance & Travaux', href: '/espace-proprietaire/travaux', icon: ClipboardCheck },
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
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-emerald-100 selection:text-emerald-900 transition-colors duration-500 overflow-x-hidden">
      {/* Mobile background overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Modern Sidebar */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-[70] w-80 bg-slate-950 text-white transform transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] border-r border-white/5 flex flex-col",
          sidebarOpen ? "translate-x-0 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)]" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="px-8 py-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none text-white italic">
                {APP_NAME}
              </h1>
              <p className="text-[9px] uppercase font-black text-emerald-500 tracking-[0.2em] mt-1.5 opacity-80">
                PRO PORTAL
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const active = isActiveLink(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold transition-all duration-300 group relative",
                  active
                    ? "bg-white/10 text-white shadow-inner"
                    : "text-slate-400 hover:text-emerald-400"
                )}
              >
                <item.icon className={clsx("w-5 h-5 transition-transform duration-300 group-hover:scale-110", active ? "text-emerald-400" : "text-slate-500")} />
                <span className="tracking-wide">{item.name}</span>
                {active && (
                   <motion.div 
                     layoutId="sidebar-active"
                     className="absolute left-0 w-1.5 h-6 bg-emerald-500 rounded-r-full"
                   />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Diagnostic */}
        <div className="p-6">
           <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 overflow-hidden relative group">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-emerald-400 text-lg border border-white/10">
                    {owner?.first_name?.[0]}{owner?.last_name?.[0]}
                 </div>
                 <div className="truncate flex-1">
                    <p className="text-sm font-black text-white truncate">{owner?.first_name} {owner?.last_name}</p>
                    <p className="text-[10px] font-bold text-slate-500 truncate">{owner?.email}</p>
                 </div>
                 <button onClick={() => setDiagOpen(!diagOpen)} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                 </button>
              </div>

              {diagOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="space-y-3 pt-4 border-t border-white/5">
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <span className="flex items-center gap-2"><Database className="w-3 h-3" /> Données liées</span>
                      <span className={propertyCount && propertyCount > 0 ? "text-emerald-400" : "text-rose-400"}>
                        {propertyCount !== null ? `${propertyCount} biens` : 'Recherche...'}
                      </span>
                   </div>
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <span className="flex items-center gap-2"><Settings className="w-3 h-3" /> RLS Status</span>
                      <span className="text-amber-400">À vérifier</span>
                   </div>
                   {propertyCount === 0 && (
                     <p className="text-[10px] text-amber-200 leading-relaxed italic mt-2 p-3 bg-amber-400/10 rounded-xl">
                       <Info className="w-3 h-3 inline mr-1" /> Votre compte n'est pas encore relié à vos biens dans la base.
                     </p>
                   )}
                </motion.div>
              )}

              <button
                onClick={handleSignOut}
                className="w-full mt-4 flex items-center justify-center gap-3 px-6 py-3 text-xs font-black uppercase tracking-widest text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-80 flex flex-col min-h-screen">
        {/* Elegant Topbar */}
        <header className="h-24 bg-white/70 backdrop-blur-xl border-b border-slate-100 flex items-center sticky top-0 z-[40]">
          <div className="flex items-center justify-between w-full px-8 lg:px-12">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-3 text-slate-600 hover:bg-slate-50 rounded-2xl lg:hidden group transition-colors"
            >
              <Menu className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-slate-400">
               <span className="text-xs font-black uppercase tracking-[0.2em]">Secteur Sécurisé</span>
               <ChevronRight className="w-4 h-4" />
               <span className="text-xs font-bold text-slate-900">{location.pathname.split('/').pop()?.toUpperCase() || 'ACCUEIL'}</span>
            </div>
            
            <div className="flex items-center gap-6">
              <button className="relative p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-[1.2rem] transition-all">
                <Bell className="w-6 h-6" />
                <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
              </button>
              <div className="h-8 w-[1px] bg-slate-100 mx-2" />
              <div className="flex items-center gap-3 pl-2">
                 <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-slate-900 leading-none">{owner?.first_name}</p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Propriétaire</p>
                 </div>
                 <div className="w-12 h-12 bg-white rounded-2xl border-2 border-emerald-50 flex items-center justify-center shadow-sm">
                   <User className="w-6 h-6 text-slate-400" />
                 </div>
              </div>
            </div>
          </div>
        </header>

        {/* Layout Content */}
        <main className="flex-1 p-8 lg:p-12 transition-all">
          <div className="max-w-[1700px] mx-auto relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.02, y: -15 }}
                transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>

            {/* Float Diagnostic Indicator */}
            {propertyCount === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed bottom-10 right-10 z-[100] max-w-xs"
              >
                <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 ring-8 ring-amber-500/5">
                   <div className="flex items-center gap-3 mb-3 text-amber-400">
                     <AlertCircle className="w-6 h-6" />
                     <p className="font-black text-xs uppercase tracking-widest">Alerte Synchro</p>
                   </div>
                   <p className="text-xs text-slate-400 leading-relaxed">
                     Aucune donnée trouvée. Demandez au gestionnaire d'agence de lier vos biens à votre ID : <span className="text-emerald-400 select-all">{owner?.id}</span>
                   </p>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
