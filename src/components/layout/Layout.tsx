import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../utils/cn';

interface LayoutProps {
  children: React.ReactNode;
}

const MAIN_CLASSES = 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50';

export const Layout: React.FC<LayoutProps> = React.memo(({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="h-screen flex" aria-label="Disposition principale de l'application">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        <main
          className={cn('flex-1 overflow-y-auto p-6', MAIN_CLASSES)}
          role="main"
          aria-label="Contenu principal"
        >
          {children}
        </main>
      </div>
    </div>
  );
});