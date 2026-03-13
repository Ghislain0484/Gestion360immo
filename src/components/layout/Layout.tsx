import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-soft dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 font-sans text-gray-900 dark:text-slate-100 transition-colors duration-300">
      <Navbar />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="transition-all duration-300">
        <div className="lg:hidden">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
        </div>

        <main className="min-h-screen pt-4 lg:pt-20 transition-all duration-200">
          <div className="p-4 lg:p-8 max-w-[1600px] mx-auto animate-slideInRight">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};