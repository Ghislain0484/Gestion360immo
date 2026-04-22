import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Key,
  Wallet,
  ClipboardCheck,
  Menu,
  Bell,
  LogOut,
  User,
  ChevronRight,
  Settings,
  Database,
  Info,
  AlertCircle,
  FileText,
  Shield,
  Gem,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { clsx } from 'clsx';
import { APP_NAME } from '../../lib/constants';
import { OwnerPaymentModal } from './OwnerPaymentModal';

const OWNER_SUBSCRIPTION_PRICE = 10000;

export const OwnerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const location = useLocation();
  const { owner, logout, refreshAuth } = useAuth();
  const navigate = useNavigate();

  const isExpired = owner?.subscription_status === 'expired';

  useEffect(() => {
    if (owner?.id) {
      supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', owner.id)
        .then(({ count }) => setPropertyCount(count));
    }
  }, [owner?.id]);

  const navigation = [
    { name: 'Dashboard', href: '/espace-proprietaire', icon: LayoutDashboard },
    { name: 'Mon parc immobilier', href: '/espace-proprietaire/proprietes', icon: Building2 },
    { name: 'Calculateur de patrimoine', href: '/espace-proprietaire/patrimoine', icon: Gem },
    { name: 'Mes locataires', href: '/espace-proprietaire/locataires', icon: Key },
    { name: 'Etats financiers', href: '/espace-proprietaire/finances', icon: Wallet },
    { name: 'Documents', href: '/espace-proprietaire/documents', icon: FileText },
    { name: 'Maintenance et travaux', href: '/espace-proprietaire/travaux', icon: ClipboardCheck },
    { name: "Projets d'embellissement", href: '/espace-proprietaire/embellissement', icon: Sparkles },
    { name: 'Securite', href: '/espace-proprietaire/securite', icon: Shield },
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const isActiveLink = (path: string) => {
    if (path === '/espace-proprietaire' && location.pathname !== '/espace-proprietaire') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 font-sans text-slate-900 transition-colors duration-500 selection:bg-emerald-100 selection:text-emerald-900 dark:bg-slate-950 dark:text-slate-100">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-[70] flex w-80 flex-col border-r border-white/5 bg-slate-950 text-white transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]',
          sidebarOpen ? 'translate-x-0 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)]' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="px-8 py-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic leading-none tracking-tight text-white">{APP_NAME}</h1>
              <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/90">
                PRO PORTAL
              </p>
            </div>
          </div>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto px-6">
          {navigation.map((item) => {
            const active = isActiveLink(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'group relative flex items-center gap-4 rounded-[1.5rem] px-6 py-4 text-sm font-bold transition-all duration-300',
                  active
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-slate-400 hover:bg-white/5 hover:text-emerald-300'
                )}
              >
                <item.icon
                  className={clsx(
                    'h-5 w-5 transition-transform duration-300 group-hover:scale-110',
                    active ? 'text-emerald-400' : 'text-slate-500'
                  )}
                />
                <span className="tracking-wide">{item.name}</span>
                {active && <motion.div layoutId="sidebar-active" className="absolute left-0 h-6 w-1.5 rounded-r-full bg-emerald-500" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/5 p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-800 text-lg font-black text-emerald-400">
                {owner?.first_name?.[0]}
                {owner?.last_name?.[0]}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <p className="truncate text-sm font-black text-white">
                  {owner?.first_name} {owner?.last_name}
                </p>
                <p className="truncate text-[10px] font-bold text-slate-500">{owner?.email}</p>
              </div>
              <button
                onClick={() => setDiagOpen((value) => !value)}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {diagOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="space-y-3 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span className="flex items-center gap-2">
                    <Database className="h-3 w-3" /> Donnees liees
                  </span>
                  <span className={propertyCount && propertyCount > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {propertyCount !== null ? `${propertyCount} biens` : 'Recherche...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span className="flex items-center gap-2">
                    <Gem className="h-3 w-3" /> Statut portal
                  </span>
                  <span className={isExpired ? 'text-amber-400' : 'text-emerald-400'}>
                    {isExpired ? 'Limite' : 'Premium'}
                  </span>
                </div>
                {propertyCount === 0 && (
                  <p className="mt-2 rounded-xl bg-amber-400/10 p-3 text-[10px] italic leading-relaxed text-amber-200">
                    <Info className="mr-1 inline h-3 w-3" />
                    Votre compte n'est pas encore relie a vos biens dans la base.
                  </p>
                )}
              </motion.div>
            )}

            <button
              onClick={handleSignOut}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest text-rose-400 transition-all duration-300 hover:bg-rose-500 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Deconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen flex-col lg:pl-80">
        <header className="sticky top-0 z-[40] flex h-24 items-center border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75">
          <div className="flex w-full items-center justify-between px-8 lg:px-12">
            <button
              onClick={() => setSidebarOpen(true)}
              className="group rounded-2xl p-3 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-6 w-6 transition-transform group-hover:scale-110" />
            </button>

            <div className="hidden items-center gap-2 text-slate-400 dark:text-slate-500 lg:flex">
              <span className="text-xs font-black uppercase tracking-[0.2em]">Secteur securise</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {location.pathname.split('/').pop()?.toUpperCase() || 'ACCUEIL'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {isExpired && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="hidden items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:bg-amber-600 md:flex"
                >
                  <Gem className="h-4 w-4" />
                  Passer premium
                </button>
              )}

              <button className="relative rounded-[1.2rem] p-3 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                <Bell className="h-6 w-6" />
                <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500 animate-pulse dark:border-slate-950" />
              </button>

              <div className="mx-1 h-8 w-px bg-slate-200 dark:bg-slate-800" />

              <div className="flex items-center gap-3 pl-2">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-black leading-none text-slate-900 dark:text-slate-100">{owner?.first_name}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500">Proprietaire</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-emerald-100 bg-white shadow-sm dark:border-emerald-500/20 dark:bg-slate-900">
                  <User className="h-6 w-6 text-slate-400 dark:text-slate-300" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto transition-all">
          {isExpired && (
            <div className="px-8 pt-8 lg:px-12">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-between gap-6 rounded-[2rem] bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white shadow-xl shadow-amber-500/20 md:flex-row"
              >
                <div className="flex items-center gap-6 text-center md:text-left">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic">Acces premium limite</h3>
                    <p className="mt-1 text-sm font-medium text-amber-100">
                      Reglez vos frais de service ({formatCurrency(OWNER_SUBSCRIPTION_PRICE)}) pour debloquer toutes les fonctionnalites.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="shrink-0 rounded-2xl bg-white px-10 py-4 text-xs font-black uppercase tracking-widest text-amber-600 shadow-lg transition-all hover:bg-amber-50 active:scale-95"
                >
                  Payer {formatCurrency(OWNER_SUBSCRIPTION_PRICE)}
                </button>
              </motion.div>
            </div>
          )}

          <div className="relative mx-auto max-w-[1700px] p-8 lg:p-12">
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

            {propertyCount === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed bottom-10 right-10 z-[100] max-w-xs"
              >
                <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6 text-white shadow-2xl ring-8 ring-amber-500/5">
                  <div className="mb-3 flex items-center gap-3 text-amber-400">
                    <AlertCircle className="h-6 w-6" />
                    <p className="text-xs font-black uppercase tracking-widest">Alerte synchro</p>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">
                    Aucune donnee trouvee. Demandez au gestionnaire d'agence de lier vos biens a votre ID :
                    <span className="select-all text-emerald-400"> {owner?.id}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </main>

        <OwnerPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={refreshAuth}
          data={{
            type: 'service_fee',
            amount: OWNER_SUBSCRIPTION_PRICE,
            title: 'Abonnement Portail Proprietaire',
            description: `Frais de service mensuels pour l'acces premium au portail ${APP_NAME}`,
            targetId: owner?.id,
          }}
        />
      </div>
    </div>
  );
};
