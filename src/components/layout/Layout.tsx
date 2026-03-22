import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Navbar } from './Navbar';
import { QuotaBanner } from '../shared/QuotaBanner';
import { LoadingBar } from '../shared/LoadingBar';
import { WifiOff } from 'lucide-react';

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-bounce">
      <div className="bg-red-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 border-2 border-white dark:border-slate-800">
        <WifiOff size={18} />
        <span className="text-xs font-black uppercase tracking-tighter">Mode Hors-ligne</span>
      </div>
    </div>
  );
};

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-mesh font-sans text-gray-900 dark:text-slate-100 transition-colors duration-500 overflow-x-hidden text-sm uppercase font-bold">
      <LoadingBar />
      <Navbar />
      <QuotaBanner />
      <NetworkStatus />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="transition-all duration-300">
        <div className="lg:hidden">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
        </div>

        <main className="min-h-screen pt-4 lg:pt-20">
          <div className="p-4 lg:p-10 max-w-[1700px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ 
                  duration: 0.5, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
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